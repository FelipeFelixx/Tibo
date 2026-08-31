import type { Database } from "@/integrations/supabase/types";

export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostPrivacy = Database["public"]["Enums"]["post_privacy"];
export type ReactionKind = Database["public"]["Enums"]["reaction_kind"];

export interface PostAuthor {
  id: string;
  username: string;
  nome: string | null;
  sobrenome: string | null;
  avatar_url: string | null;
  verificado: boolean;
  publicRole: string | null;
}

export interface PostImage {
  id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  position: number;
}

export interface PostVideo {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  duration_seconds: number | null;
}

export interface PollOptionRow {
  id: string;
  label: string;
  position: number;
  votes: number;
  votedByMe: boolean;
}
export interface PollRow {
  id: string;
  question: string;
  allow_multiple: boolean;
  closes_at: string | null;
  options: PollOptionRow[];
  totalVotes: number;
}

export interface ReactionSummary {
  counts: Record<ReactionKind, number>;
  myReaction: ReactionKind | null;
  total: number;
}

export interface PostFull {
  post: Post;
  author: PostAuthor;
  images: PostImage[];
  video: PostVideo | null;
  poll: PollRow | null;
  reactions: ReactionSummary;
  commentCount: number;
  shareCount: number;
  isSaved: boolean;
}

export interface CommentNode {
  id: string;
  post_id: string;
  author: PostAuthor;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  edited_at: string | null;
  likeCount: number;
  likedByMe: boolean;
  replies: CommentNode[];
}

export const REACTION_META: Record<ReactionKind, { label: string }> = {
  curtir: { label: "Curtir" },
  amei: { label: "Amei" },
  interessante: { label: "Interessante" },
  engracado: { label: "Engraçado" },
};