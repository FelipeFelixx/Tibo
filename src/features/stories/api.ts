import { supabase } from "@/integrations/supabase/client";
import type { Highlight, StoryAuthor, StoryGroup, StoryItem, StoryViewer } from "./types";

const AUTHOR_SELECT = "id,username,nome,sobrenome,avatar_url,verificado";

async function getUid(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export const STORY_IMAGE_DURATION = 5;
export const MAX_STORY_VIDEO_SECONDS = 60;

interface StoryRowLite {
  id: string;
  author_id: string;
  media_type: StoryItem["media_type"];
  storage_path: string;
  duration_seconds: number | null;
  caption: string | null;
  music_title: string | null;
  created_at: string;
  expires_at: string;
}

function toItem(
  row: StoryRowLite,
  views: Map<string, number>,
  likes: Map<string, number>,
  likedByMe: Set<string>,
  seenByMe: Set<string>,
): StoryItem {
  return {
    ...row,
    viewCount: views.get(row.id) ?? 0,
    likeCount: likes.get(row.id) ?? 0,
    likedByMe: likedByMe.has(row.id),
    seenByMe: seenByMe.has(row.id),
  };
}

/** Active (non-expired) stories, grouped by author. Mine first, then unseen. */
export async function fetchStoryFeed(): Promise<StoryGroup[]> {
  const uid = await getUid();
  if (!uid) return [];

  // Stories are social-follow based: show only my own stories and stories
  // from accounts I actually follow. Pending/private follow requests do not count.
  const { data: followRows, error: followError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", uid);
  if (followError) throw followError;

  const allowedAuthorIds = new Set([uid, ...(followRows ?? []).map((row) => row.following_id)]);
  const { data: rows, error } = await supabase
    .from("stories")
    .select("id,author_id,media_type,storage_path,duration_seconds,caption,music_title,created_at,expires_at")
    .gt("expires_at", new Date().toISOString())
    .in("author_id", Array.from(allowedAuthorIds))
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!rows?.length) return [];

  const ids = rows.map((r) => r.id);
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const [authorsRes, viewsRes, likesRes, myLikesRes, mySeenRes] = await Promise.all([
    supabase.from("profiles").select(AUTHOR_SELECT).in("id", authorIds),
    supabase.from("story_views").select("story_id").in("story_id", ids),
    supabase.from("story_likes").select("story_id").in("story_id", ids),
    supabase.from("story_likes").select("story_id").in("story_id", ids).eq("user_id", uid),
    supabase.from("story_views").select("story_id").in("story_id", ids).eq("viewer_id", uid),
  ]);

  const authors = new Map<string, StoryAuthor>();
  (authorsRes.data ?? []).forEach((a) => authors.set(a.id, a as StoryAuthor));
  const views = count(viewsRes.data ?? [], (v) => v.story_id);
  const likes = count(likesRes.data ?? [], (l) => l.story_id);
  const likedByMe = new Set((myLikesRes.data ?? []).map((l) => l.story_id));
  const seenByMe = new Set((mySeenRes.data ?? []).map((v) => v.story_id));

  const grouped = new Map<string, StoryItem[]>();
  rows.forEach((r) => {
    const item = toItem(r as StoryRowLite, views, likes, likedByMe, seenByMe);
    if (!grouped.has(r.author_id)) grouped.set(r.author_id, []);
    grouped.get(r.author_id)!.push(item);
  });

  const groups: StoryGroup[] = [];
  grouped.forEach((stories, authorId) => {
    const author = authors.get(authorId);
    if (!author) return;
    groups.push({
      author,
      stories,
      hasUnseen: stories.some((s) => !s.seenByMe),
      isMine: authorId === uid,
    });
  });

  return groups.sort((a, b) => {
    if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    const aLast = a.stories[a.stories.length - 1].created_at;
    const bLast = b.stories[b.stories.length - 1].created_at;
    return bLast.localeCompare(aLast);
  });
}

export interface CreateStoryInput {
  file: File;
  kind: "image" | "video";
  durationSeconds?: number;
  caption?: string;
  musicTitle?: string;
}

export async function createStory(input: CreateStoryInput): Promise<string> {
  const uid = await getUid();
  if (!uid) throw new Error("Não autenticado");
  if (input.kind === "video" && (input.durationSeconds ?? 0) > MAX_STORY_VIDEO_SECONDS) {
    throw new Error(`Vídeos de story precisam ter até ${MAX_STORY_VIDEO_SECONDS} segundos.`);
  }

  const ext = (input.file.type.split("/")[1] || (input.kind === "video" ? "webm" : "webp")).replace("jpeg", "jpg");
  const path = `${uid}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("stories")
    .upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("stories")
    .insert({
      author_id: uid,
      media_type: input.kind,
      storage_path: path,
      duration_seconds: input.kind === "video" ? (input.durationSeconds ?? null) : STORY_IMAGE_DURATION,
      caption: input.caption?.trim() || null,
      music_title: input.musicTitle?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteStory(storyId: string) {
  const { error } = await supabase.from("stories").delete().eq("id", storyId);
  if (error) throw error;
}

export async function markStoryViewed(storyId: string) {
  const uid = await getUid();
  if (!uid) return;
  await supabase
    .from("story_views")
    .upsert({ story_id: storyId, viewer_id: uid }, { onConflict: "story_id,viewer_id" });
}

export async function toggleStoryLike(storyId: string, liked: boolean) {
  const uid = await getUid();
  if (!uid) throw new Error("Não autenticado");
  if (liked) {
    const { error } = await supabase.from("story_likes").delete().eq("story_id", storyId).eq("user_id", uid);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("story_likes").insert({ story_id: storyId, user_id: uid });
    if (error) throw error;
  }
}

export async function replyToStory(storyId: string, content: string) {
  const uid = await getUid();
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase.from("story_replies").insert({ story_id: storyId, author_id: uid, content });
  if (error) throw error;
}

export async function fetchStoryViewers(storyId: string): Promise<StoryViewer[]> {
  const [viewsRes, likesRes] = await Promise.all([
    supabase
      .from("story_views")
      .select("viewer_id,created_at")
      .eq("story_id", storyId)
      .order("created_at", { ascending: false }),
    supabase.from("story_likes").select("user_id").eq("story_id", storyId),
  ]);
  const rows = viewsRes.data ?? [];
  if (!rows.length) return [];
  const liked = new Set((likesRes.data ?? []).map((l) => l.user_id));
  const { data: profs } = await supabase
    .from("profiles")
    .select(AUTHOR_SELECT)
    .in("id", rows.map((r) => r.viewer_id));
  const map = new Map<string, StoryAuthor>();
  (profs ?? []).forEach((p) => map.set(p.id, p as StoryAuthor));
  return rows
    .filter((r) => map.has(r.viewer_id))
    .map((r) => ({ user: map.get(r.viewer_id)!, viewed_at: r.created_at, liked: liked.has(r.viewer_id) }));
}

// ============ Highlights ============
export async function fetchHighlights(userId: string): Promise<Highlight[]> {
  const { data, error } = await supabase
    .from("story_highlights")
    .select("id,title,cover_path,position")
    .eq("user_id", userId)
    .order("position");
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];
  const { data: items } = await supabase
    .from("story_highlight_items")
    .select("highlight_id,story_id,position")
    .in("highlight_id", rows.map((r) => r.id))
    .order("position");
  const byHighlight = new Map<string, string[]>();
  (items ?? []).forEach((i) => {
    if (!byHighlight.has(i.highlight_id)) byHighlight.set(i.highlight_id, []);
    byHighlight.get(i.highlight_id)!.push(i.story_id);
  });
  return rows.map((r) => ({ ...r, storyIds: byHighlight.get(r.id) ?? [] }));
}

export async function fetchHighlightStories(storyIds: string[]): Promise<StoryItem[]> {
  if (!storyIds.length) return [];
  const uid = await getUid();
  const { data, error } = await supabase
    .from("stories")
    .select("id,author_id,media_type,storage_path,duration_seconds,caption,music_title,created_at,expires_at")
    .in("id", storyIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as StoryRowLite[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [viewsRes, likesRes, myLikesRes] = await Promise.all([
    supabase.from("story_views").select("story_id").in("story_id", ids),
    supabase.from("story_likes").select("story_id").in("story_id", ids),
    uid
      ? supabase.from("story_likes").select("story_id").in("story_id", ids).eq("user_id", uid)
      : Promise.resolve({ data: [] as Array<{ story_id: string }> }),
  ]);
  const views = count(viewsRes.data ?? [], (v) => v.story_id);
  const likes = count(likesRes.data ?? [], (l) => l.story_id);
  const mine = new Set((myLikesRes.data ?? []).map((l) => l.story_id));
  return rows.map((r) => toItem(r, views, likes, mine, new Set<string>()));
}

export async function createHighlight(title: string, storyIds: string[], coverPath: string | null) {
  const uid = await getUid();
  if (!uid) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("story_highlights")
    .insert({ user_id: uid, title, cover_path: coverPath })
    .select("id")
    .single();
  if (error) throw error;
  if (storyIds.length) {
    const { error: itemsErr } = await supabase
      .from("story_highlight_items")
      .insert(storyIds.map((story_id, position) => ({ highlight_id: data.id, story_id, position })));
    if (itemsErr) throw itemsErr;
  }
  return data.id;
}

export async function deleteHighlight(highlightId: string) {
  const { error } = await supabase.from("story_highlights").delete().eq("id", highlightId);
  if (error) throw error;
}

function count<T>(arr: T[], key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  arr.forEach((it) => {
    const k = key(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  });
  return m;
}