import { supabase } from "@/integrations/supabase/client";

const db = supabase;

export type AdminOverview = Record<string, number>;
export type PlatformTeamMember = { user_id: string; username: string; display_name: string; role: string; created_at: string };
export type AdminBadge = { id: string; name: string; description: string | null; image_path: string; category: string | null; level: number; active: boolean; sort_order: number };
export type UserBadge = { id: string; badge_id: string; name: string; description: string | null; image_path: string; category: string | null; level: number; is_visible: boolean; display_order: number; granted_at: string };

export async function getAdminOverview(): Promise<AdminOverview> {
  const { data, error } = await db.rpc("admin_overview");
  if (error) throw error;
  return (data ?? {}) as AdminOverview;
}

export async function listPlatformTeam(): Promise<PlatformTeamMember[]> {
  const { data, error } = await db.rpc("admin_list_platform_team");
  if (error) throw error;
  return (data ?? []) as PlatformTeamMember[];
}

export async function upsertPlatformTeam(userId: string, role: string) {
  const { error } = await db.rpc("admin_upsert_platform_team", { _user_id: userId, _role: role });
  if (error) throw error;
}

export async function removePlatformTeam(userId: string) {
  const { error } = await db.rpc("admin_remove_platform_team", { _user_id: userId });
  if (error) throw error;
}

export async function listBadges(): Promise<AdminBadge[]> {
  const { data, error } = await (db as any)
    .from("tibo_badges")
    .select("*")
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as AdminBadge[];
}

export async function createBadge(input: { name: string; description?: string; imagePath: string; category?: string; level?: number }) {
  const { data, error } = await db.rpc("admin_create_badge", { _name: input.name, _description: input.description ?? "", _image_path: input.imagePath, _category: input.category ?? "", _level: input.level ?? 1 });
  if (error) throw error;
  return data as string;
}

export async function uploadBadgeImage(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `badges/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from("tibo-badges").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path as string;
}

export async function grantBadge(userId: string, badgeId: string) {
  const { error } = await db.rpc("admin_grant_badge", { _user_id: userId, _badge_id: badgeId });
  if (error) throw error;
}

export async function revokeBadge(userId: string, badgeId: string) {
  const { error } = await db.rpc("admin_revoke_badge", { _user_id: userId, _badge_id: badgeId });
  if (error) throw error;
}

export async function getMyBadges(): Promise<UserBadge[]> {
  const { data, error } = await db.rpc("get_my_badges");
  if (error) throw error;
  return (data ?? []) as UserBadge[];
}

export async function setMyBadgeVisibility(id: string, visible: boolean, order = 0) {
  const { error } = await db.rpc("set_my_badge_visibility", { _user_badge_id: id, _is_visible: visible, _display_order: order });
  if (error) throw error;
}

export async function getBadgeImageUrl(path: string) {
  const { data, error } = await db.storage.from("tibo-badges").createSignedUrl(path, 3600);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function adminDeleteBadge(badgeId: string) {
  const { error } = await db.rpc("admin_delete_badge", {
    _badge_id: badgeId,
  });

  if (error) throw error;
}
