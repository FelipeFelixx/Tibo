import { supabase } from "@/integrations/supabase/client";

export type UserSummary = {
  id: string;
  username: string;
  nome: string | null;
  sobrenome: string | null;
  avatar_url: string | null;
  verificado: boolean;
};

const USER_SELECT = "id,username,nome,sobrenome,avatar_url,verificado";

async function profilesByIds(ids: string[]): Promise<UserSummary[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("profiles").select(USER_SELECT).in("id", ids);
  if (error) throw error;
  return (data ?? []) as UserSummary[];
}

export async function fetchFriends(userId: string): Promise<UserSummary[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;
  const otherIds = (data ?? []).map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
  return profilesByIds(otherIds);
}

export async function fetchPendingFriendRequests(): Promise<
  Array<{ id: string; requester: UserSummary; created_at: string }>
> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("friendships")
    .select("id, created_at, requester_id")
    .eq("status", "pending")
    .eq("addressee_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const profs = await profilesByIds(rows.map((r) => r.requester_id));
  const map = new Map(profs.map((p) => [p.id, p]));
  return rows
    .map((r) => ({ id: r.id, created_at: r.created_at, requester: map.get(r.requester_id) }))
    .filter((r): r is { id: string; created_at: string; requester: UserSummary } => !!r.requester);
}

export async function fetchFollowers(userId: string): Promise<UserSummary[]> {
  const { data, error } = await supabase.from("follows").select("follower_id").eq("following_id", userId);
  if (error) throw error;
  return profilesByIds((data ?? []).map((r) => r.follower_id));
}

export async function fetchFollowing(userId: string): Promise<UserSummary[]> {
  const { data, error } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  if (error) throw error;
  return profilesByIds((data ?? []).map((r) => r.following_id));
}

export type UserCommunityRow = {
  id: string;
  name: string;
  slug: string;
  avatar_path: string | null;
  member_count: number;
  visibility: "publica" | "privada";
};

export async function fetchUserCommunities(userId: string): Promise<UserCommunityRow[]> {
  // Busca as comunidades onde o usuário possui membership.
  const { data: memberships, error: memberError } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("user_id", userId);

  if (memberError) throw memberError;

  const memberIds = (memberships ?? []).map((r) => r.community_id);

  // O dono é membro da comunidade mesmo que uma linha antiga
  // em community_members ainda não exista.
  const { data: owned, error: ownerError } = await supabase
    .from("communities")
    .select("id")
    .eq("owner_id", userId);

  if (ownerError) throw ownerError;

  const ownerIds = (owned ?? []).map((r) => r.id);
  const ids = [...new Set([...memberIds, ...ownerIds])];

  if (!ids.length) return [];

  const { data: comms, error: err2 } = await supabase
    .from("communities")
    .select("id, name, slug, avatar_path, member_count, visibility")
    .in("id", ids);

  if (err2) throw err2;

  return (comms ?? []) as UserCommunityRow[];
}