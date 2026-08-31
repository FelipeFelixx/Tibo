import { supabase } from "@/integrations/supabase/client";
import type {
  Profile,
  ProfileStats,
  ProfileUpdate,
  ProfileWithStats,
  ViewerRelationship,
} from "./types";

export async function fetchProfileByUsername(username: string): Promise<ProfileWithStats | null> {
  const db = supabase;
  const { data, error } = await db.rpc("get_profile_by_username", { _username: username });
  if (error) throw error;
  const profile = data?.[0] as Profile | undefined;
  if (!profile) return null;

  const stats = await fetchProfileStats(profile.id);

  // Cargo público do Tibo.
  // A tabela é somente leitura para o cliente.
  const { data: roleRow, error: roleError } = await (db as any)
    .from("tibo_user_roles")
    .select("role")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (roleError) {
    console.warn("[Profile] Não foi possível carregar cargo público:", roleError);
  }

  return {
    ...profile,
    stats,
    publicRole: roleRow?.role ?? null,
  };
}

export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const db = supabase;
  const { data, error } = await db.rpc("get_profile_stats", { _user_id: userId });
  if (error) throw error;
  const row = data?.[0];
  return {
    amigos: Number(row?.amigos ?? 0),
    seguidores: Number(row?.seguidores ?? 0),
    seguindo: Number(row?.seguindo ?? 0),
    comunidades: Number(row?.comunidades ?? 0),
  };
}

export async function fetchViewerRelationship(
  targetUserId: string,
): Promise<ViewerRelationship> {
  const { data: session } = await supabase.auth.getSession();
  const viewerId = session.session?.user.id;
  if (!viewerId) return { isOwner: false, friendship: null, isFollowing: false };
  if (viewerId === targetUserId) return { isOwner: true, friendship: null, isFollowing: false };

  const db = supabase;
  const { data, error } = await db.rpc("get_viewer_relationship", { _target_id: targetUserId });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return { isOwner: false, friendship: null, isFollowing: false };
  return {
    isOwner: !!row.is_owner,
    friendship:
      row.friendship_id && row.friendship_status && row.friendship_requester_id
        ? {
            id: row.friendship_id,
            status: row.friendship_status,
            requesterId: row.friendship_requester_id,
          }
        : null,
    isFollowing: !!row.is_following,
  };
}

export async function updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getMyProfile(): Promise<Profile | null> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

// ============ Storage ============
export type BucketName =
  | "avatars"
  | "covers"
  | "post-media"
  | "community-media"
  | "chat-media"
  | "stories"
  | "business-ads";

export async function uploadProfileImage(
  bucket: BucketName,
  userId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  // supabase-js v2 doesn't stream progress; simulate steps
  onProgress?.(10);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;
  onProgress?.(100);
  return path;
}

export async function removeProfileImage(bucket: BucketName, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export async function getSignedImageUrl(
  bucket: BucketName,
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) {
    console.error("[getSignedImageUrl]", { bucket, path, error });
    throw error;
  }
  return data?.signedUrl ?? null;
}

// ============ Friendship & Follow actions ============
export async function sendFriendRequest(targetId: string) {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: uid, addressee_id: targetId, status: "pending" });
  if (error) throw error;
}

export async function cancelFriendship(friendshipId: string) {
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}

export async function respondFriendRequest(
  friendshipId: string,
  status: "accepted" | "rejected",
) {
  const { error } = await supabase
    .from("friendships")
    .update({ status })
    .eq("id", friendshipId);
  if (error) throw error;
}

export async function followUser(targetId: string) {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: uid, following_id: targetId });
  if (error) throw error;
}

export async function unfollowUser(targetId: string) {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", uid)
    .eq("following_id", targetId);
  if (error) throw error;
}