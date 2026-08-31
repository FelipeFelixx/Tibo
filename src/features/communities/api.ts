import { supabase } from "@/integrations/supabase/client";
import type {
  Community,
  CommunityCard,
  CommunityCategory,
  CommunityInsert,
  CommunityMemberRow,
  CommunityRole,
  CommunityUpdate,
  JoinRequestRow,
  ViewerMembership,
} from "./types";

const PAGE_SIZE = 20;

export interface CommunityListPage {
  items: CommunityCard[];
  nextPage: number | null;
}

export async function fetchCategories(): Promise<CommunityCategory[]> {
  const { data, error } = await supabase
    .from("community_categories")
    .select("*")
    .order("position");
  if (error) throw error;
  return data ?? [];
}

export async function fetchCommunitiesPage(params: {
  page: number;
  search?: string;
  categorySlug?: string;
  onlyMine?: boolean;
}): Promise<CommunityListPage> {
  const { page, search, categorySlug, onlyMine } = params;
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("communities")
    .select("*, category:community_categories(id,name,slug,icon)")
    .order("member_count", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search && search.trim().length > 0) {
    query = query.ilike("name", `%${search.trim()}%`);
  }
  if (categorySlug) {
    const { data: cat } = await supabase
      .from("community_categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (cat?.id) query = query.eq("category_id", cat.id);
  }
  if (onlyMine) {
    const { data: session } = await supabase.auth.getSession();
    const uid = session?.session?.user?.id;
    if (!uid) return { items: [], nextPage: null };
    const { data: memberships } = await supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", uid);
    const ids = (memberships ?? []).map((m) => m.community_id);
    if (ids.length === 0) return { items: [], nextPage: null };
    query = query.in("id", ids);
  }

  const { data, error } = await query;
  if (error) throw error;
  const items = (data ?? []) as CommunityCard[];
  const nextPage = items.length === PAGE_SIZE ? page + 1 : null;
  return { items, nextPage };
}

export async function fetchCommunityBySlug(slug: string): Promise<CommunityCard | null> {
  const { data, error } = await supabase
    .from("communities")
    .select("*, category:community_categories(id,name,slug,icon)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as CommunityCard | null;
}

export async function fetchViewerMembership(
  communityId: string,
): Promise<ViewerMembership> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session?.session?.user?.id;

  if (!uid) {
    return {
      isMember: false,
      role: null,
      pendingRequestId: null,
    };
  }

  // O dono da comunidade é sempre considerado membro/owner,
  // independentemente da existência do registro em community_members.
  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("owner_id")
    .eq("id", communityId)
    .maybeSingle();

  if (communityError) throw communityError;

  if (community?.owner_id === uid) {
    return {
      isMember: true,
      role: "owner",
      pendingRequestId: null,
    };
  }

  const [{ data: member, error: memberError }, { data: req, error: reqError }] =
    await Promise.all([
      supabase
        .from("community_members")
        .select("role")
        .eq("community_id", communityId)
        .eq("user_id", uid)
        .maybeSingle(),

      supabase
        .from("community_join_requests")
        .select("id")
        .eq("community_id", communityId)
        .eq("user_id", uid)
        .eq("status", "pending")
        .maybeSingle(),
    ]);

  if (memberError) throw memberError;
  if (reqError) throw reqError;

  return {
    isMember: !!member,
    role: member?.role ?? null,
    pendingRequestId: req?.id ?? null,
  };
}

export async function fetchMembers(
  communityId: string,
  page: number,
  pageSize: number
): Promise<{ items: CommunityMemberRow[]; nextPage: number | null }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("community_members")
    .select(
      "id,user_id,role,joined_at,profile:profiles!community_members_user_id_fkey(id,username,nome,sobrenome,avatar_url,verificado)"
    )
    .eq("community_id", communityId)
    .order("joined_at", { ascending: true })
    .range(from, to);

  if (error) throw error;

  let items = (data ?? []) as unknown as CommunityMemberRow[];

  // O dono é sempre considerado membro da comunidade.
  // Isso também corrige comunidades antigas que não possuem
  // uma linha do owner em community_members.
  const { data: community, error: ownerError } = await supabase
    .from("communities")
    .select("owner_id,created_at")
    .eq("id", communityId)
    .maybeSingle();

  if (ownerError) throw ownerError;

  if (
    community?.owner_id &&
    !items.some((m) => m.user_id === community.owner_id)
  ) {
    const { data: ownerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id,username,nome,sobrenome,avatar_url,verificado")
      .eq("id", community.owner_id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (ownerProfile) {
      const ownerMember = {
        id: `owner-${community.owner_id}`,
        user_id: community.owner_id,
        role: "owner",
        joined_at: community.created_at,
        profile: ownerProfile,
      } as unknown as CommunityMemberRow;

      items = [ownerMember, ...items].slice(0, pageSize);
    }
  }

  return {
    items,
    nextPage: (data ?? []).length === pageSize ? page + 1 : null,
  };
}
export async function fetchJoinRequests(communityId: string): Promise<JoinRequestRow[]> {
  const { data, error } = await supabase
    .from("community_join_requests")
    .select("id,user_id,status,message,created_at,profile:profiles!community_join_requests_user_id_fkey(id,username,nome,avatar_url)")
    .eq("community_id", communityId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as JoinRequestRow[];
}

export async function createCommunity(
  input: CommunityInsert,
  ownerId: string
): Promise<Community> {
  console.log("[TIBO] criando comunidade via INSERT", {
    name: input.name,
    slug: input.slug,
    ownerId,
  });

  const { data, error } = await supabase
    .from("communities")
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      rules: input.rules ?? null,
      category_id: input.category_id ?? null,
      visibility: input.visibility,
      owner_id: ownerId,
    })
    .select("*")
    .single();

  console.log("[TIBO] INSERT terminou:", { data, error });

  if (error) {
    throw new Error(`Erro ao criar comunidade: ${error.message}`);
  }

  if (!data) {
    throw new Error("Supabase não retornou a comunidade criada.");
  }

  return data;
}


export async function uploadCommunityMedia(communityId: string, file: File, kind: "cover" | "avatar"): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${communityId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("community-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}

export async function getCommunityMediaUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("community-media").createSignedUrl(path, 3600);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function updateCommunity(id: string, updates: CommunityUpdate): Promise<Community> {
  const { data, error } = await supabase
    .from("communities")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCommunity(id: string): Promise<void> {
  const { error } = await supabase.from("communities").delete().eq("id", id);
  if (error) throw error;
}

export async function joinCommunity(communityId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session?.session?.user?.id;
  if (!uid) throw new Error("Faça login.");
  const { error } = await supabase
    .from("community_members")
    .insert({ community_id: communityId, user_id: uid, role: "member" });
  if (error) throw error;
}

export async function leaveCommunity(communityId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session?.session?.user?.id;
  if (!uid) throw new Error("Faça login.");
  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", uid);
  if (error) throw error;
}

export async function requestJoin(communityId: string, message?: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session?.session?.user?.id;
  if (!uid) throw new Error("Faça login.");
  const { error } = await supabase
    .from("community_join_requests")
    .insert({ community_id: communityId, user_id: uid, message: message ?? null });
  if (error) throw error;
}

export async function cancelJoinRequest(requestId: string): Promise<void> {
  const { error } = await supabase.from("community_join_requests").delete().eq("id", requestId);
  if (error) throw error;
}

export async function decideJoinRequest(requestId: string, approve: boolean): Promise<void> {
  const { data: req, error: fetchErr } = await supabase
    .from("community_join_requests")
    .select("community_id,user_id")
    .eq("id", requestId)
    .single();
  if (fetchErr) throw fetchErr;
  const { data: session } = await supabase.auth.getSession();
  const uid = session?.session?.user?.id;
  const { error: updateErr } = await supabase
    .from("community_join_requests")
    .update({
      status: approve ? "approved" : "rejected",
      decided_at: new Date().toISOString(),
      decided_by: uid ?? null,
    })
    .eq("id", requestId);
  if (updateErr) throw updateErr;
  if (approve) {
    const { error: memberErr } = await supabase
      .from("community_members")
      .insert({ community_id: req.community_id, user_id: req.user_id, role: "member" });
    if (memberErr && memberErr.code !== "23505") throw memberErr;
  }
}

export async function updateMemberRole(
  memberId: string,
  role: CommunityRole,
): Promise<void> {
  const { error } = await supabase.from("community_members").update({ role }).eq("id", memberId);
  if (error) throw error;
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from("community_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function pinPost(postId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from("posts").update({ is_pinned: pinned }).eq("id", postId);
  if (error) throw error;
}

export async function reportInCommunity(input: {
  communityId: string;
  targetUserId?: string;
  postId?: string;
  reason: string;
}): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session?.session?.user?.id;
  if (!uid) throw new Error("Faça login.");
  const { error } = await supabase.from("community_reports").insert({
    community_id: input.communityId,
    reporter_id: uid,
    target_user_id: input.targetUserId ?? null,
    post_id: input.postId ?? null,
    reason: input.reason,
  });
  if (error) throw error;
}

export async function inviteFriend(communityId: string, friendUserId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session?.session?.user?.id;
  if (!uid) throw new Error("Faça login.");
  const { error } = await supabase.from("community_invites").insert({
    community_id: communityId,
    inviter_id: uid,
    invitee_id: friendUserId,
  });
  if (error) throw error;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}