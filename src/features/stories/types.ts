import type { Database } from "@/integrations/supabase/types";

export type StoryRow = Database["public"]["Tables"]["stories"]["Row"];
export type StoryMediaType = Database["public"]["Enums"]["story_media_type"];

export interface StoryAuthor {
  id: string;
  username: string;
  nome: string | null;
  sobrenome: string | null;
  avatar_url: string | null;
  verificado: boolean;
}

export interface StoryItem {
  id: string;
  author_id: string;
  media_type: StoryMediaType;
  storage_path: string;
  duration_seconds: number | null;
  caption: string | null;
  music_title: string | null;
  created_at: string;
  expires_at: string;
  viewCount: number;
  likeCount: number;
  likedByMe: boolean;
  seenByMe: boolean;
}

export interface StoryGroup {
  author: StoryAuthor;
  stories: StoryItem[];
  hasUnseen: boolean;
  isMine: boolean;
}

export interface StoryViewer {
  user: StoryAuthor;
  viewed_at: string;
  liked: boolean;
}

export interface Highlight {
  id: string;
  title: string;
  cover_path: string | null;
  position: number;
  storyIds: string[];
}