import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type PrivacyAudience = Database["public"]["Enums"]["privacy_audience"];

export interface ProfileStats {
  amigos: number;
  seguidores: number;
  seguindo: number;
  comunidades: number;
}

export interface ProfileWithStats extends Profile {
  stats: ProfileStats;
  publicRole: string | null;
}

export type FriendshipStatus = Database["public"]["Enums"]["friendship_status"];

export interface ViewerRelationship {
  isOwner: boolean;
  friendship: { id: string; status: FriendshipStatus; requesterId: string } | null;
  isFollowing: boolean;
}