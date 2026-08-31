import type { Database } from "@/integrations/supabase/types";

export type Community = Database["public"]["Tables"]["communities"]["Row"];
export type CommunityInsert = Database["public"]["Tables"]["communities"]["Insert"];
export type CommunityUpdate = Database["public"]["Tables"]["communities"]["Update"];
export type CommunityCategory = Database["public"]["Tables"]["community_categories"]["Row"];
export type CommunityRole = Database["public"]["Enums"]["community_role"];
export type CommunityVisibility = Database["public"]["Enums"]["community_visibility"];
export type JoinRequestStatus = Database["public"]["Enums"]["join_request_status"];

export interface CommunityCard extends Community {
  category: Pick<CommunityCategory, "id" | "name" | "slug" | "icon"> | null;
}

export interface CommunityMemberRow {
  id: string;
  user_id: string;
  role: CommunityRole;
  joined_at: string;
  profile: {
    id: string;
    username: string;
    nome: string | null;
    sobrenome: string | null;
    avatar_url: string | null;
    verificado: boolean;
  };
}

export interface JoinRequestRow {
  id: string;
  user_id: string;
  status: JoinRequestStatus;
  message: string | null;
  created_at: string;
  profile: {
    id: string;
    username: string;
    nome: string | null;
    avatar_url: string | null;
  };
}

export interface ViewerMembership {
  isMember: boolean;
  role: CommunityRole | null;
  pendingRequestId: string | null;
}