import { supabase } from "@/integrations/supabase/client";
import { rankPosts, type FeedRankingContext } from "./ranking";
import * as tus from "tus-js-client";
import type {
  CommentNode,
  PollRow,
  PostAuthor,
  PostFull,
  PostPrivacy,
  PostVideo,
  ReactionKind,
  ReactionSummary,
} from "./types";

export const FEED_PAGE_SIZE = 10;

// O algoritmo Tibo precisa de uma quantidade maior de candidatos
// para conseguir escolher os conteúdos mais relevantes.
// O usuário continua recebendo apenas 10 por página.
const FEED_CANDIDATE_SIZE = 50;

const AUTHOR_SELECT = "id,username,nome,sobrenome,avatar_url,verificado";

async function getUid(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export interface FeedPage {
  posts: PostFull[];
  nextCursor: string | null;
}

export async function fetchFeedPage(cursor: string | null): Promise<FeedPage> {
  const uid = await getUid();
  if (!uid) return { posts: [], nextCursor: null };

  // RLS enforces visibility (public / friends / owner). We only exclude drafts here.
  let query = supabase
    .from("posts")
    .select("*")
    .neq("privacy", "rascunho")
    .order("created_at", { ascending: false })
    .limit(FEED_CANDIDATE_SIZE);
  if (cursor) query = query.lt("created_at", cursor);

  const { data: posts, error } = await query;
  if (error) throw error;
  if (!posts?.length) return { posts: [], nextCursor: null };

  let enriched = await enrichPosts(posts, uid);

  if (uid) {
    const context = await fetchFeedRankingContext(uid);

    // O Algoritmo Tibo escolhe os melhores conteúdos entre
    // uma janela maior de candidatos, em vez de apenas ordenar
    // os 10 posts mais recentes.
    enriched = rankPosts(enriched, context);
  }

  // O usuário recebe somente uma página de 10 posts.
  const visiblePosts = enriched.slice(0, FEED_PAGE_SIZE);

  const nextCursor =
    posts.length === FEED_CANDIDATE_SIZE
      ? posts[posts.length - 1].created_at
      : null;

  return {
    posts: visiblePosts,
    nextCursor,
  };
}

export async function fetchUserPostsPage(userId: string, cursor: string | null): Promise<FeedPage> {
  const uid = await getUid();
  let query = supabase
    .from("posts")
    .select("*")
    .eq("author_id", userId)
    .neq("privacy", "rascunho")
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return { posts: [], nextCursor: null };
  const enriched = await enrichPosts(data, uid);
  const nextCursor = data.length === FEED_PAGE_SIZE ? data[data.length - 1].created_at : null;
  return { posts: enriched, nextCursor };
}

export async function fetchCommunityPostsPage(communityId: string, cursor: string | null): Promise<FeedPage> {
  const uid = await getUid();
  let query = supabase
    .from("posts")
    .select("*")
    .eq("community_id", communityId)
    .neq("privacy", "rascunho")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return { posts: [], nextCursor: null };
  const enriched = await enrichPosts(data, uid);
  const nextCursor = data.length === FEED_PAGE_SIZE ? data[data.length - 1].created_at : null;
  return { posts: enriched, nextCursor };
}

async function fetchFeedRankingContext(uid: string): Promise<FeedRankingContext> {
  const [followsRes, friendsRes, communitiesRes] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", uid),
    supabase.from("friendships").select("requester_id,addressee_id").eq("status", "accepted").or(`requester_id.eq.${uid},addressee_id.eq.${uid}`),
    supabase.from("community_members").select("community_id").eq("user_id", uid),
  ]);
  const followedAuthorIds = new Set((followsRes.data ?? []).map((r) => r.following_id));
  const friendIds = new Set<string>();
  (friendsRes.data ?? []).forEach((r) => friendIds.add(r.requester_id === uid ? r.addressee_id : r.requester_id));
  const communityIds = new Set((communitiesRes.data ?? []).map((r) => r.community_id));
  return { followedAuthorIds, friendIds, communityIds };
}

async function enrichPosts(posts: Array<{ id: string; author_id: string; created_at: string }>, uid: string | null): Promise<PostFull[]> {
  const postIds = posts.map((p) => p.id);
  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));

  const [
    authorsRes,
    rolesRes,
    imagesRes,
    videosRes,
    reactionsRes,
    myReactionsRes,
    commentCountRes,
    shareCountRes,
    savedRes,
    pollsRes,
  ] = await Promise.all([
    supabase.from("profiles").select(AUTHOR_SELECT).in("id", authorIds),
    (supabase as any).from("tibo_user_roles").select("user_id,role").in("user_id", authorIds),
    supabase.from("post_images").select("*").in("post_id", postIds).order("position"),
    supabase.from("post_videos").select("*").in("post_id", postIds),
    supabase.from("post_reactions").select("post_id,kind").in("post_id", postIds),
    uid
      ? supabase.from("post_reactions").select("post_id,kind").in("post_id", postIds).eq("user_id", uid)
      : Promise.resolve({ data: [] as Array<{ post_id: string; kind: ReactionKind }> }),
    supabase.from("comments").select("post_id").in("post_id", postIds),
    supabase.from("shares").select("post_id").in("post_id", postIds),
    uid
      ? supabase.from("saved_posts").select("post_id").in("post_id", postIds).eq("user_id", uid)
      : Promise.resolve({ data: [] as Array<{ post_id: string }> }),
    supabase.from("polls").select("*").in("post_id", postIds),
  ]);

  const authorsMap = new Map<string, PostAuthor>();
  authorsRes.data?.forEach((a) =>
    authorsMap.set(a.id, {
      ...(a as Omit<PostAuthor, "publicRole">),
      publicRole: null,
    }),
  );

  const rolesMap = new Map<string, string>();
  rolesRes.data?.forEach((r: { user_id: string; role: string }) => {
    rolesMap.set(r.user_id, r.role);
  });

  authorsMap.forEach((author, userId) => {
    author.publicRole = rolesMap.get(userId) ?? null;
  });

  const imagesByPost = groupBy(imagesRes.data ?? [], (i) => i.post_id);
  const videosByPost = new Map<string, unknown>();
  videosRes.data?.forEach((v) => videosByPost.set(v.post_id, v));

  const reactionCounts = new Map<string, Record<ReactionKind, number>>();
  reactionsRes.data?.forEach(({ post_id, kind }) => {
    if (!reactionCounts.has(post_id))
      reactionCounts.set(post_id, { curtir: 0, amei: 0, interessante: 0, engracado: 0 });
    reactionCounts.get(post_id)![kind]++;
  });
  const myReactionMap = new Map<string, ReactionKind>();
  myReactionsRes.data?.forEach((r) => myReactionMap.set(r.post_id, r.kind as ReactionKind));

  const commentCountMap = countGroup(commentCountRes.data ?? [], (c) => c.post_id);
  const shareCountMap = countGroup(shareCountRes.data ?? [], (s) => s.post_id);
  const savedSet = new Set((savedRes.data ?? []).map((s) => s.post_id));

  // Polls with options and votes
  const polls = pollsRes.data ?? [];
  const pollIds = polls.map((p) => p.id);
  const [optionsRes, votesRes] = await Promise.all([
    pollIds.length
      ? supabase.from("poll_options").select("*").in("poll_id", pollIds).order("position")
      : Promise.resolve({ data: [] as Array<{ id: string; poll_id: string; label: string; position: number }> }),
    pollIds.length
      ? supabase.from("poll_votes").select("poll_id,option_id,user_id").in("poll_id", pollIds)
      : Promise.resolve({ data: [] as Array<{ poll_id: string; option_id: string; user_id: string }> }),
  ]);
  const optionsByPoll = groupBy(optionsRes.data ?? [], (o) => o.poll_id);
  const voteCountByOption = countGroup(votesRes.data ?? [], (v) => v.option_id);
  const myVotesByOption = new Set(
    (votesRes.data ?? []).filter((v) => v.user_id === uid).map((v) => v.option_id),
  );
  const pollsByPost = new Map<string, PollRow>();
  polls.forEach((p) => {
    const opts = (optionsByPoll.get(p.id) ?? []).map((o) => ({
      id: o.id,
      label: o.label,
      position: o.position,
      votes: voteCountByOption.get(o.id) ?? 0,
      votedByMe: myVotesByOption.has(o.id),
    }));
    const total = opts.reduce((s, o) => s + o.votes, 0);
    pollsByPost.set(p.post_id, {
      id: p.id,
      question: p.question,
      allow_multiple: p.allow_multiple,
      closes_at: p.closes_at,
      options: opts,
      totalVotes: total,
    });
  });

  return posts.map((p) => {
    const counts = reactionCounts.get(p.id) ?? { curtir: 0, amei: 0, interessante: 0, engracado: 0 };
    const reactions: ReactionSummary = {
      counts,
      myReaction: myReactionMap.get(p.id) ?? null,
      total: counts.curtir + counts.amei + counts.interessante + counts.engracado,
    };
    return {
      post: p as PostFull["post"],
      author: authorsMap.get(p.author_id) ?? {
        id: p.author_id,
        username: "usuario",
        nome: null,
        sobrenome: null,
        avatar_url: null,
        verificado: false,
                            publicRole: null,
      },
      images: imagesByPost.get(p.id) ?? [],
      video: (videosByPost.get(p.id) ?? null) as PostFull["video"],
      poll: pollsByPost.get(p.id) ?? null,
      reactions,
      commentCount: commentCountMap.get(p.id) ?? 0,
      shareCount: shareCountMap.get(p.id) ?? 0,
      isSaved: savedSet.has(p.id),
    };
  });
}

function groupBy<T, K>(arr: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  arr.forEach((it) => {
    const k = key(it);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(it);
  });
  return m;
}
function countGroup<T, K>(arr: T[], key: (t: T) => K): Map<K, number> {
  const m = new Map<K, number>();
  arr.forEach((it) => {
    const k = key(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  });
  return m;
}

// ============ Create post ============
export interface CreatePostInput {
  content: string;
  privacy: PostPrivacy;
  location?: string;
  link_url?: string;
  images: File[];
  video?: File | null;
  poll?: {
    question: string;
    allow_multiple: boolean;
    options: string[];
  } | null;
  community_id?: string | null;
}

export async function createPost(input: CreatePostInput): Promise<string> {
  const uid = await getUid();
  if (!uid) throw new Error("Não autenticado");

  const postPayload = {
    author_id: uid,
    content: input.content || null,
    privacy: input.community_id ? "comunidade" : input.privacy,
    location: input.location || null,
    link_url: input.link_url || null,
    community_id: input.community_id ?? null,
  };

  console.log("[TIBO] CREATE POST payload:", postPayload);

  const { data: post, error } = await supabase
    .from("posts")
    .insert(postPayload)
    .select("id")
    .single();

  console.log("[TIBO] CREATE POST result:", {
    postId: post?.id ?? null,
    error: error?.message ?? null,
    code: error?.code ?? null,
  });

  if (error) throw error;

  const postId = post.id;
  const uploadedPaths: string[] = [];

  const rollback = async (originalError: unknown) => {
    console.error("[TIBO] CREATE POST FALHOU — iniciando rollback:", {
      postId,
      error: originalError,
      uploadedPaths,
    });

    if (uploadedPaths.length) {
      const { error: storageErr } = await supabase.storage
        .from("post-media")
        .remove(uploadedPaths);

      if (storageErr) {
        console.error(
          "[TIBO] ERRO AO REMOVER ARQUIVOS DURANTE ROLLBACK:",
          storageErr
        );
      }
    }

    console.error(
      "[TIBO] ROLLBACK: POST PRESERVADO PARA DEBUG",
      { postId, uploadedPaths }
    );

    // Não apagar o post durante o diagnóstico.
    // Isso permite identificar no banco exatamente até onde a publicação chegou.

    if (originalError instanceof Error) {
      throw originalError;
    }

    throw new Error("Não foi possível publicar o post.");
  };

  try {
    // Upload images
    if (input.images.length) {
      const imgRows: Array<{
        post_id: string;
        storage_path: string;
        position: number;
      }> = [];

      for (let i = 0; i < input.images.length; i++) {
        const file = input.images[i];
        const ext = (file.type.split("/")[1] || "webp").replace(
          "jpeg",
          "jpg"
        );
        const path = `${uid}/${postId}/${i}-${Date.now()}.${ext}`;

        console.log("[createPost] tentando upload da foto", {
          bucket: "post-media",
          path,
          name: file.name,
          type: file.type,
          size: file.size,
        });

        const { error: upErr } = await supabase.storage
          .from("post-media")
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
          });

        if (upErr) {
          console.error("[createPost] ERRO NO UPLOAD DA FOTO", upErr);
          throw new Error(
            `Upload da foto falhou: ${
              upErr.message || "erro desconhecido"
            }`
          );
        }

        uploadedPaths.push(path);

        console.log("[createPost] upload da foto OK", path);

        imgRows.push({
          post_id: postId,
          storage_path: path,
          position: i,
        });
      }

      const { error: imgErr } = await supabase
        .from("post_images")
        .insert(imgRows);

      if (imgErr) {
        console.error(
          "[createPost] ERRO AO SALVAR FOTOS NO POST",
          imgErr
        );
        throw imgErr;
      }
    }

    // Upload video
    if (input.video) {
      const file = input.video;

      // Keep the storage extension aligned with the actual MIME type.
      // Previously video/quicktime was saved with a .mp4 extension while
      // retaining video/quicktime metadata, which can make browsers reject
      // or fail to decode the uploaded asset.
      const mime = (file.type || "video/mp4").toLowerCase();
      const extByMime: Record<string, string> = {
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/ogg": "ogv",
        "video/quicktime": "mov",
        "video/x-matroska": "mkv",
      };
      const ext = extByMime[mime] ?? (file.name.split(".").pop()?.toLowerCase() || "webm");
      const path = `${uid}/${postId}/video-${Date.now()}.${ext}`;

      console.log("[createPost] tentando upload do vídeo", {
        bucket: "post-media",
        path,
        name: file.name,
        type: file.type,
        size: file.size,
      });

      console.log("[TIBO] VIDEO: iniciando upload direto", {
        postId,
        path,
        name: file.name,
        type: file.type,
        size: file.size,
      });

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: mime,
          upsert: false,
        });

      if (uploadError) {
        console.error("[TIBO] VIDEO: ERRO NO UPLOAD", uploadError);
        throw new Error(
          `Upload do vídeo falhou: ${uploadError.message || "erro desconhecido"}`
        );
      }

      console.log("[TIBO] VIDEO: upload concluído", {
        postId,
        path,
      });

      uploadedPaths.push(path);

      console.log("[createPost] upload do vídeo OK", {
        path,
        size: file.size,
        type: file.type,
      });

      const { error: videoRowErr } = await supabase
        .from("post_videos")
        .insert({
          post_id: postId,
          storage_path: path,
        });

      if (videoRowErr) {
        console.error(
          "[createPost] ERRO AO SALVAR VÍDEO NO POST",
          videoRowErr
        );

        throw videoRowErr;
      }

      console.log("[createPost] vídeo salvo no post OK", {
        postId,
        path,
      });
    }

    // Poll
    if (input.poll && input.poll.options.length >= 2) {
      const { data: poll, error: pollErr } = await supabase
        .from("polls")
        .insert({
          post_id: postId,
          question: input.poll.question,
          allow_multiple: input.poll.allow_multiple,
        })
        .select("id")
        .single();

      if (pollErr) throw pollErr;

      const options = input.poll.options
        .slice(0, 6)
        .map((label, i) => ({
          poll_id: poll.id,
          label,
          position: i,
        }));

      const { error: optErr } = await supabase
        .from("poll_options")
        .insert(options);

      if (optErr) throw optErr;
    }

    console.log("[TIBO] CREATE POST FINALIZADO COM SUCESSO", {
      postId,
      uploadedPaths,
    });

    return postId;
  } catch (error) {
    return rollback(error);
  }
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

// ============ Reactions ============
export async function setReaction(postId: string, kind: ReactionKind | null) {
  const uid = await getUid();
  if (!uid) throw new Error("Não autenticado");
  if (kind === null) {
    const { error } = await supabase
      .from("post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", uid);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("post_reactions")
    .upsert({ post_id: postId, user_id: uid, kind }, { onConflict: "post_id,user_id" });
  if (error) throw error;
}

// ============ Save / Share / Report ============
export async function toggleSavedPost(postId: string, isSaved: boolean) {
  const uid = await getUid();
  if (!uid) throw new Error("Não autenticado");
  if (isSaved) {
    const { error } = await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", uid);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("saved_posts").insert({ post_id: postId, user_id: uid });
    if (error) throw error;
  }
}
export async function sharePost(postId: string) {
  const uid = await getUid();
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase.from("shares").insert({ post_id: postId, user_id: uid });
  if (error) throw error;
}
export async function reportPost(postId: string, reason: string) {
  const uid = await getUid();
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase.from("post_reports").insert({ post_id: postId, reporter_id: uid, reason });
  if (error) throw error;
}
export async function reportComment(commentId: string, reason: string) {
  const uid = await getUid();
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase.from("comment_reports").insert({ comment_id: commentId, reporter_id: uid, reason });
  if (error) throw error;
}

// ============ Comments ============
export async function fetchComments(postId: string): Promise<CommentNode[]> {
  const uid = await getUid();
  const { data: comments, error } = await supabase
    .from("comments")
    .select(`id,post_id,author_id,parent_comment_id,content,created_at,edited_at,
             author:profiles!comments_author_id_fkey(${AUTHOR_SELECT})`)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!comments?.length) return [];

  const ids = comments.map((c) => c.id);
  const [likesRes, myLikesRes] = await Promise.all([
    supabase.from("comment_likes").select("comment_id").in("comment_id", ids),
    uid
      ? supabase.from("comment_likes").select("comment_id").in("comment_id", ids).eq("user_id", uid)
      : Promise.resolve({ data: [] as Array<{ comment_id: string }> }),
  ]);
  const likeCounts = countGroup(likesRes.data ?? [], (l) => l.comment_id);
  const myLikes = new Set((myLikesRes.data ?? []).map((l) => l.comment_id));

  const nodes = new Map<string, CommentNode>();
  comments.forEach((c) => {
    nodes.set(c.id, {
      id: c.id,
      post_id: c.post_id,
      author: (c.author as unknown as PostAuthor) ?? {
        id: c.author_id, username: "usuario", nome: null, sobrenome: null, avatar_url: null, verificado: false,
      },
      parent_comment_id: c.parent_comment_id,
      content: c.content,
      created_at: c.created_at,
      edited_at: c.edited_at,
      likeCount: likeCounts.get(c.id) ?? 0,
      likedByMe: myLikes.has(c.id),
      replies: [],
    });
  });
  const roots: CommentNode[] = [];
  nodes.forEach((node) => {
    if (node.parent_comment_id && nodes.has(node.parent_comment_id)) {
      nodes.get(node.parent_comment_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export async function addComment(postId: string, content: string, parentId: string | null) {
  const uid = await getUid();
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: uid, parent_comment_id: parentId, content });
  if (error) throw error;
}
export async function updateComment(commentId: string, content: string) {
  const { error } = await supabase
    .from("comments")
    .update({ content, edited_at: new Date().toISOString() })
    .eq("id", commentId);
  if (error) throw error;
}
export async function deleteComment(commentId: string) {
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) throw error;
}
export async function toggleCommentLike(commentId: string, liked: boolean) {
  const uid = await getUid();
  if (!uid) throw new Error("Não autenticado");
  if (liked) {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", uid);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("comment_likes")
      .insert({ comment_id: commentId, user_id: uid });
    if (error) throw error;
  }
}

// ============ Polls voting ============
export async function votePoll(pollId: string, optionId: string, allowMultiple: boolean, currentlyVotedOptionIds: string[]) {
  const uid = await getUid();
  if (!uid) throw new Error("Não autenticado");
  if (!allowMultiple && currentlyVotedOptionIds.length) {
    const { error: delErr } = await supabase
      .from("poll_votes")
      .delete()
      .eq("poll_id", pollId)
      .eq("user_id", uid);
    if (delErr) throw delErr;
  }
  const alreadyVoted = currentlyVotedOptionIds.includes(optionId);
  if (alreadyVoted && allowMultiple) {
    const { error } = await supabase
      .from("poll_votes")
      .delete()
      .eq("poll_id", pollId)
      .eq("option_id", optionId)
      .eq("user_id", uid);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("poll_votes")
    .insert({ poll_id: pollId, option_id: optionId, user_id: uid });
  if (error) throw error;
}

export async function fetchClipsPage(cursor: string | null): Promise<FeedPage> {
  const uid = await getUid();
  if (!uid) return { posts: [], nextCursor: null };

  let videoQuery = supabase
    .from("post_videos")
    .select("post_id,created_at")
    .order("created_at", { ascending: false })
    .limit(15);

  if (cursor) videoQuery = videoQuery.lt("created_at", cursor);

  const { data: videos, error: videosError } = await videoQuery;
  if (videosError) throw videosError;
  if (!videos?.length) return { posts: [], nextCursor: null };

  const ids = videos.map((v) => v.post_id);
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("*")
    .in("id", ids)
    .neq("privacy", "rascunho")
    .is("community_id", null);

  if (postsError) throw postsError;
  if (!posts?.length) return { posts: [], nextCursor: null };

  const byId = new Map(posts.map((post) => [post.id, post]));
  const visiblePosts = videos
    .map((video) => byId.get(video.post_id))
    .filter((post): post is NonNullable<typeof post> => Boolean(post));

  if (!visiblePosts.length) {
    return {
      posts: [],
      nextCursor: videos[videos.length - 1]?.created_at ?? null,
    };
  }

  const enriched = await enrichPosts(visiblePosts, uid);
  const context = await fetchFeedRankingContext(uid);
  const ranked = rankPosts(enriched, context);
  return {
    posts: ranked,
    nextCursor: videos[videos.length - 1]?.created_at ?? null,
  };
}

export async function incrementClipView(postId: string) {
  const { error } = await supabase.rpc("increment_post_views", { _post_id: postId });
  if (error) throw error;
}
