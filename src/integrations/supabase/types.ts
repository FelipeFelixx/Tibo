export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reports: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reason: string
          reporter_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          avatar_path: string | null
          banner_path: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          member_count: number
          name: string
          owner_id: string
          rules: string | null
          slug: string
          updated_at: string
          visibility: Database["public"]["Enums"]["community_visibility"]
        }
        Insert: {
          avatar_path?: string | null
          banner_path?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          member_count?: number
          name: string
          owner_id: string
          rules?: string | null
          slug: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["community_visibility"]
        }
        Update: {
          avatar_path?: string | null
          banner_path?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          member_count?: number
          name?: string
          owner_id?: string
          rules?: string | null
          slug?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["community_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "communities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "community_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      community_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      community_invites: {
        Row: {
          community_id: string
          created_at: string
          id: string
          invitee_id: string
          inviter_id: string
          status: Database["public"]["Enums"]["invite_status"]
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          invitee_id: string
          inviter_id: string
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "community_invites_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_join_requests: {
        Row: {
          community_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          message: string | null
          status: Database["public"]["Enums"]["join_request_status"]
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["join_request_status"]
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["join_request_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_join_requests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["community_role"]
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_role"]
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          community_id: string
          created_at: string
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          target_user_id: string | null
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          post_id?: string | null
          reason: string
          reporter_id: string
          target_user_id?: string | null
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          last_message_at: string
          name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          name?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          deleted_for: string[]
          id: string
          image_url: string | null
          read_at: string | null
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          deleted_for?: string[]
          id?: string
          image_url?: string | null
          read_at?: string | null
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          deleted_for?: string[]
          id?: string
          image_url?: string | null
          read_at?: string | null
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          label: string
          poll_id: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          poll_id: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          poll_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_multiple: boolean
          closes_at: string | null
          created_at: string
          id: string
          post_id: string
          question: string
        }
        Insert: {
          allow_multiple?: boolean
          closes_at?: string | null
          created_at?: string
          id?: string
          post_id: string
          question: string
        }
        Update: {
          allow_multiple?: boolean
          closes_at?: string | null
          created_at?: string
          id?: string
          post_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_hashtags: {
        Row: {
          created_at: string
          post_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          post_id: string
          tag: string
        }
        Update: {
          created_at?: string
          post_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hashtags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_images: {
        Row: {
          created_at: string
          height: number | null
          id: string
          position: number
          post_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          post_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          post_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          kind: Database["public"]["Enums"]["reaction_kind"]
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind: Database["public"]["Enums"]["reaction_kind"]
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: Database["public"]["Enums"]["reaction_kind"]
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reason: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reason: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_videos: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          post_id: string
          size_bytes: number | null
          storage_path: string
          thumbnail_path: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          post_id: string
          size_bytes?: number | null
          storage_path: string
          thumbnail_path?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          post_id?: string
          size_bytes?: number | null
          storage_path?: string
          thumbnail_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_videos_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          community_id: string | null
          content: string | null
          created_at: string
          edited_at: string | null
          id: string
          is_pinned: boolean
          is_reel: boolean
          link_url: string | null
          location: string | null
          privacy: Database["public"]["Enums"]["post_privacy"]
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          community_id?: string | null
          content?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          is_reel?: boolean
          link_url?: string | null
          location?: string | null
          privacy?: Database["public"]["Enums"]["post_privacy"]
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          community_id?: string | null
          content?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          is_reel?: boolean
          link_url?: string | null
          location?: string | null
          privacy?: Database["public"]["Enums"]["post_privacy"]
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cidade: string | null
          cover_url: string | null
          created_at: string
          data_nascimento: string | null
          estado: string | null
          id: string
          nome: string | null
          pais: string | null
          perfil_publico: boolean
          premium: boolean
          quem_pode_amizade: Database["public"]["Enums"]["privacy_audience"]
          quem_pode_mensagem: Database["public"]["Enums"]["privacy_audience"]
          quem_pode_seguir: Database["public"]["Enums"]["privacy_audience"]
          site: string | null
          sobrenome: string | null
          updated_at: string
          username: string
          verificado: boolean
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cidade?: string | null
          cover_url?: string | null
          created_at?: string
          data_nascimento?: string | null
          estado?: string | null
          id: string
          nome?: string | null
          pais?: string | null
          perfil_publico?: boolean
          premium?: boolean
          quem_pode_amizade?: Database["public"]["Enums"]["privacy_audience"]
          quem_pode_mensagem?: Database["public"]["Enums"]["privacy_audience"]
          quem_pode_seguir?: Database["public"]["Enums"]["privacy_audience"]
          site?: string | null
          sobrenome?: string | null
          updated_at?: string
          username: string
          verificado?: boolean
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cidade?: string | null
          cover_url?: string | null
          created_at?: string
          data_nascimento?: string | null
          estado?: string | null
          id?: string
          nome?: string | null
          pais?: string | null
          perfil_publico?: boolean
          premium?: boolean
          quem_pode_amizade?: Database["public"]["Enums"]["privacy_audience"]
          quem_pode_mensagem?: Database["public"]["Enums"]["privacy_audience"]
          quem_pode_seguir?: Database["public"]["Enums"]["privacy_audience"]
          site?: string | null
          sobrenome?: string | null
          updated_at?: string
          username?: string
          verificado?: boolean
        }
        Relationships: []
      }
      saved_posts: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shares: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          author_id: string
          caption: string | null
          created_at: string
          duration_seconds: number | null
          expires_at: string
          id: string
          media_type: Database["public"]["Enums"]["story_media_type"]
          music_title: string | null
          music_url: string | null
          storage_path: string
          thumbnail_path: string | null
        }
        Insert: {
          author_id: string
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string
          id?: string
          media_type: Database["public"]["Enums"]["story_media_type"]
          music_title?: string | null
          music_url?: string | null
          storage_path: string
          thumbnail_path?: string | null
        }
        Update: {
          author_id?: string
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string
          id?: string
          media_type?: Database["public"]["Enums"]["story_media_type"]
          music_title?: string | null
          music_url?: string | null
          storage_path?: string
          thumbnail_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_highlight_items: {
        Row: {
          created_at: string
          highlight_id: string
          position: number
          story_id: string
        }
        Insert: {
          created_at?: string
          highlight_id: string
          position?: number
          story_id: string
        }
        Update: {
          created_at?: string
          highlight_id?: string
          position?: number
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_highlight_items_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "story_highlights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_highlight_items_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_highlights: {
        Row: {
          cover_path: string | null
          created_at: string
          id: string
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          id?: string
          position?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_highlights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_likes: {
        Row: {
          created_at: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_likes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_replies: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          story_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          story_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_replies_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          created_at: string
          story_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          story_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          story_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          last_seen: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      businesses: {
        Row: { id: string; owner_id: string; name: string; slug: string; legal_name: string | null; category: string | null; description: string | null; website: string | null; email: string | null; phone: string | null; city: string | null; state: string | null; country: string | null; avatar_path: string | null; cover_path: string | null; status: Database["public"]["Enums"]["business_status"]; verification_status: Database["public"]["Enums"]["business_verification_status"]; tax_id: string | null; legal_country: string | null; legal_address: string | null; verification_notes: string | null; verified_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; owner_id: string; name: string; slug: string; legal_name?: string | null; category?: string | null; description?: string | null; website?: string | null; email?: string | null; phone?: string | null; city?: string | null; state?: string | null; country?: string | null; avatar_path?: string | null; cover_path?: string | null; status?: Database["public"]["Enums"]["business_status"]; verification_status?: Database["public"]["Enums"]["business_verification_status"]; tax_id?: string | null; legal_country?: string | null; legal_address?: string | null; verification_notes?: string | null; verified_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; owner_id?: string; name?: string; slug?: string; legal_name?: string | null; category?: string | null; description?: string | null; website?: string | null; email?: string | null; phone?: string | null; city?: string | null; state?: string | null; country?: string | null; avatar_path?: string | null; cover_path?: string | null; status?: Database["public"]["Enums"]["business_status"]; verification_status?: Database["public"]["Enums"]["business_verification_status"]; tax_id?: string | null; legal_country?: string | null; legal_address?: string | null; verification_notes?: string | null; verified_at?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      business_members: {
        Row: { business_id: string; user_id: string; role: Database["public"]["Enums"]["business_member_role"]; created_at: string }
        Insert: { business_id: string; user_id: string; role?: Database["public"]["Enums"]["business_member_role"]; created_at?: string }
        Update: { business_id?: string; user_id?: string; role?: Database["public"]["Enums"]["business_member_role"]; created_at?: string }
        Relationships: []
      }
      ad_campaigns: {
        Row: { id: string; business_id: string; name: string; objective: Database["public"]["Enums"]["ad_objective"]; status: Database["public"]["Enums"]["ad_campaign_status"]; daily_budget: number; total_budget: number; spent: number; currency: string; funded_amount: number; cost_per_lead: number; last_payment_at: string | null; start_at: string | null; end_at: string | null; target_age_min: number | null; target_age_max: number | null; target_gender: string | null; target_locations: string[]; created_at: string; updated_at: string }
        Insert: { id?: string; business_id: string; name: string; objective?: Database["public"]["Enums"]["ad_objective"]; status?: Database["public"]["Enums"]["ad_campaign_status"]; daily_budget?: number; total_budget?: number; spent?: number; currency?: string; funded_amount?: number; cost_per_lead?: number; last_payment_at?: string | null; start_at?: string | null; end_at?: string | null; target_age_min?: number | null; target_age_max?: number | null; target_gender?: string | null; target_locations?: string[]; created_at?: string; updated_at?: string }
        Update: { id?: string; business_id?: string; name?: string; objective?: Database["public"]["Enums"]["ad_objective"]; status?: Database["public"]["Enums"]["ad_campaign_status"]; daily_budget?: number; total_budget?: number; spent?: number; currency?: string; funded_amount?: number; cost_per_lead?: number; last_payment_at?: string | null; start_at?: string | null; end_at?: string | null; target_age_min?: number | null; target_age_max?: number | null; target_gender?: string | null; target_locations?: string[]; created_at?: string; updated_at?: string }
        Relationships: []
      }
      ad_creatives: {
        Row: { id: string; campaign_id: string; headline: string; body: string | null; cta_label: string; destination_url: string | null; image_path: string | null; video_path: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; campaign_id: string; headline: string; body?: string | null; cta_label?: string; destination_url?: string | null; image_path?: string | null; video_path?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; campaign_id?: string; headline?: string; body?: string | null; cta_label?: string; destination_url?: string | null; image_path?: string | null; video_path?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      ad_events: {
        Row: { id: string; creative_id: string; viewer_id: string | null; event_type: Database["public"]["Enums"]["ad_event_type"]; created_at: string }
        Insert: { id?: string; creative_id: string; viewer_id?: string | null; event_type: Database["public"]["Enums"]["ad_event_type"]; created_at?: string }
        Update: { id?: string; creative_id?: string; viewer_id?: string | null; event_type?: Database["public"]["Enums"]["ad_event_type"]; created_at?: string }
        Relationships: []
      }
      ad_checkout_sessions: {
        Row: { id: string; business_id: string; ad_account_id: string; campaign_id: string; stripe_session_id: string; amount: number; currency: string; status: string; idempotency_key: string; created_at: string; paid_at: string | null }
        Insert: { id?: string; business_id: string; ad_account_id: string; campaign_id: string; stripe_session_id: string; amount: number; currency: string; status?: string; idempotency_key: string; created_at?: string; paid_at?: string | null }
        Update: { id?: string; business_id?: string; ad_account_id?: string; campaign_id?: string; stripe_session_id?: string; amount?: number; currency?: string; status?: string; idempotency_key?: string; created_at?: string; paid_at?: string | null }
        Relationships: []
      }
      ad_leads: {
        Row: { id: string; creative_id: string; campaign_id: string; viewer_id: string; name: string | null; email: string | null; phone: string | null; consent_at: string; idempotency_key: string; created_at: string }
        Insert: { id?: string; creative_id: string; campaign_id: string; viewer_id: string; name?: string | null; email?: string | null; phone?: string | null; consent_at?: string; idempotency_key: string; created_at?: string }
        Update: { id?: string; creative_id?: string; campaign_id?: string; viewer_id?: string; name?: string | null; email?: string | null; phone?: string | null; consent_at?: string; idempotency_key?: string; created_at?: string }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: { id: string; stripe_event_id: string; event_type: string; processed_at: string }
        Insert: { id?: string; stripe_event_id: string; event_type: string; processed_at?: string }
        Update: { id?: string; stripe_event_id?: string; event_type?: string; processed_at?: string }
        Relationships: []
      }
      business_verifications: {
        Row: { id: string; business_id: string; legal_name: string; tax_id: string; country: string; legal_address: string; contact_email: string; website: string | null; document_paths: string[]; status: Database["public"]["Enums"]["business_verification_status"]; reviewer_notes: string | null; submitted_at: string; reviewed_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; business_id: string; legal_name: string; tax_id: string; country: string; legal_address: string; contact_email: string; website?: string | null; document_paths?: string[]; status?: Database["public"]["Enums"]["business_verification_status"]; reviewer_notes?: string | null; submitted_at?: string; reviewed_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; business_id?: string; legal_name?: string; tax_id?: string; country?: string; legal_address?: string; contact_email?: string; website?: string | null; document_paths?: string[]; status?: Database["public"]["Enums"]["business_verification_status"]; reviewer_notes?: string | null; submitted_at?: string; reviewed_at?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      ad_accounts: {
        Row: { id: string; business_id: string; account_name: string; status: Database["public"]["Enums"]["ad_account_status"]; currency: string; timezone: string; daily_spend_limit: number; lifetime_spend_limit: number; created_at: string; updated_at: string }
        Insert: { id?: string; business_id: string; account_name: string; status?: Database["public"]["Enums"]["ad_account_status"]; currency?: string; timezone?: string; daily_spend_limit?: number; lifetime_spend_limit?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; business_id?: string; account_name?: string; status?: Database["public"]["Enums"]["ad_account_status"]; currency?: string; timezone?: string; daily_spend_limit?: number; lifetime_spend_limit?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      billing_profiles: {
        Row: { id: string; business_id: string; provider: string; provider_customer_id: string | null; provider_payment_method_id: string | null; status: Database["public"]["Enums"]["billing_status"]; default_currency: string; country: string | null; last4: string | null; brand: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; business_id: string; provider?: string; provider_customer_id?: string | null; provider_payment_method_id?: string | null; status?: Database["public"]["Enums"]["billing_status"]; default_currency?: string; country?: string | null; last4?: string | null; brand?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; business_id?: string; provider?: string; provider_customer_id?: string | null; provider_payment_method_id?: string | null; status?: Database["public"]["Enums"]["billing_status"]; default_currency?: string; country?: string | null; last4?: string | null; brand?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      ad_billing_transactions: {
        Row: { id: string; business_id: string; ad_account_id: string; campaign_id: string | null; provider: string; provider_transaction_id: string | null; amount: number; currency: string; status: Database["public"]["Enums"]["billing_transaction_status"]; description: string | null; created_at: string; processed_at: string | null }
        Insert: { id?: string; business_id: string; ad_account_id: string; campaign_id?: string | null; provider: string; provider_transaction_id?: string | null; amount: number; currency?: string; status?: Database["public"]["Enums"]["billing_transaction_status"]; description?: string | null; created_at?: string; processed_at?: string | null }
        Update: { id?: string; business_id?: string; ad_account_id?: string; campaign_id?: string | null; provider?: string; provider_transaction_id?: string | null; amount?: number; currency?: string; status?: Database["public"]["Enums"]["billing_transaction_status"]; description?: string | null; created_at?: string; processed_at?: string | null }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_overview: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_list_support_tickets: {
        Args: { _status?: string }
        Returns: {
          id: string
          user_id: string
          username: string
          display_name: string
          assigned_to: string | null
          assigned_username: string | null
          assigned_display_name: string | null
          category: string
          subject: string
          description: string
          status: string
          priority: string
          internal_notes: string | null
          resolution: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
        }[]
      }
      admin_update_support_ticket: {
        Args: {
          _ticket_id: string
          _status: string
          _priority?: string | null
          _internal_notes?: string | null
          _resolution?: string | null
        }
        Returns: undefined
      }
      admin_assign_support_ticket: {
        Args: {
          _ticket_id: string
          _assigned_to?: string | null
        }
        Returns: undefined
      }
      create_support_ticket: {
        Args: {
          _category: string
          _subject: string
          _description: string
          _priority?: string
        }
        Returns: string
      }
      list_my_support_tickets: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          category: string
          subject: string
          description: string
          status: string
          priority: string
          resolution: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
        }[]
      }
      admin_list_moderation_cases: {
        Args: { _status?: string | null }
        Returns: {
          id: string
          report_type: string
          report_id: string
          status: string
          priority: string
          reason: string | null
          reporter_id: string | null
          target_user_id: string | null
          assigned_to: string | null
          internal_notes: string | null
          resolution: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
          assigned_username: string | null
          assigned_display_name: string | null
        }[]
      }
      admin_update_moderation_case: {
        Args: {
          _case_id: string
          _status: string
          _internal_notes?: string | null
          _resolution?: string | null
        }
        Returns: undefined
      }
      admin_assign_moderation_case: {
        Args: {
          _case_id: string
          _assigned_to?: string | null
        }
        Returns: undefined
      }
      admin_list_platform_team: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          username: string
          display_name: string
          role: string
          created_at: string
        }[]
      }
      admin_upsert_platform_team: {
        Args: { _user_id: string; _role: string }
        Returns: undefined
      }
      admin_remove_platform_team: {
        Args: { _user_id: string }
        Returns: undefined
      }
      admin_create_badge: {
        Args: {
          _name: string
          _description: string
          _image_path: string
          _category: string
          _level: number
        }
        Returns: string
      }
      admin_delete_badge: {
          Args: {
            _badge_id: string
          }
          Returns: undefined
        }
        admin_grant_badge: {
        Args: { _user_id: string; _badge_id: string }
        Returns: undefined
      }
      admin_revoke_badge: {
        Args: { _user_id: string; _badge_id: string }
        Returns: undefined
      }
      set_my_badge_visibility: {
        Args: { _user_badge_id: string; _is_visible: boolean; _display_order?: number }
        Returns: undefined
      }
      get_my_badges: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          badge_id: string
          name: string
          description: string | null
          image_path: string
          category: string | null
          level: number
          is_visible: boolean
          display_order: number
          granted_at: string
        }[]
      }
      get_user_badges: {
        Args: { _user_id: string }
        Returns: {
          id: string
          badge_id: string
          name: string
          description: string | null
          image_path: string
          category: string | null
          level: number
          is_visible: boolean
          display_order: number
          granted_at: string
        }[]
      }
      admin_find_users: {
        Args: { _query?: string }
        Returns: {
          user_id: string
          username: string
          display_name: string
        }[]
      }
      suggested_profiles: {
        Args: { _limit?: number }
        Returns: {
          id: string
          username: string
          nome: string | null
          sobrenome: string | null
          avatar_url: string | null
          verificado: boolean | null
        }[]
      }
      search_profiles: {
        Args: { _query?: string }
        Returns: {
          id: string
          username: string
          nome: string | null
          sobrenome: string | null
          avatar_url: string | null
          verificado: boolean | null
        }[]
      }
      get_viewer_relationship: {
        Args: { _target_id: string }
        Returns: {
          is_owner: boolean
          friendship_id: string | null
          friendship_status: Database["public"]["Enums"]["friendship_status"] | null
          friendship_requester_id: string | null
          is_following: boolean
        }[]
      }
      get_profile_by_username: {
        Args: { _username: string }
        Returns: Database["public"]["Tables"]["profiles"]["Row"][]
      }
      get_profile_stats: {
        Args: { _user_id: string }
        Returns: {
          amigos: number
          seguidores: number
          seguindo: number
          comunidades: number
        }[]
      }
      is_platform_admin: { Args: { _uid?: string | null }; Returns: boolean }
      admin_list_business_verifications: {
        Args: Record<PropertyKey, never>
        Returns: {
          verification_id: string
          business_id: string
          business_name: string
          owner_id: string
          legal_name: string
          tax_id: string
          country: string
          legal_address: string
          contact_email: string
          website: string | null
          status: Database["public"]["Enums"]["business_verification_status"]
          reviewer_notes: string | null
          submitted_at: string
          reviewed_at: string | null
        }[]
      }
      admin_review_business_verification: {
        Args: { _business_id: string; _status: Database["public"]["Enums"]["business_verification_status"]; _reviewer_notes?: string | null }
        Returns: undefined
      }
      can_manage_business: { Args: { _business_id: string; _uid: string }; Returns: boolean }
      get_active_ads: { Args: { _limit?: number }; Returns: { creative_id: string; campaign_id: string; business_id: string; business_name: string; business_avatar_path: string | null; headline: string; body: string | null; cta_label: string; destination_url: string | null; image_path: string | null; video_path: string | null; objective: Database["public"]["Enums"]["ad_objective"]; cost_per_lead: number; currency: string }[] }
      is_business_member: { Args: { _business_id: string; _uid: string }; Returns: boolean }
      track_ad_event: { Args: { _creative_id: string; _event_type: Database["public"]["Enums"]["ad_event_type"] }; Returns: string }
      track_ad_lead: { Args: { _creative_id: string; _name?: string | null; _email?: string | null; _phone?: string | null; _idempotency_key?: string | null }; Returns: string }
      submit_business_verification: { Args: { _business_id: string; _legal_name: string; _tax_id: string; _country: string; _legal_address: string; _contact_email: string; _website?: string | null }; Returns: string }
      can_run_ads: { Args: { _business_id: string }; Returns: boolean }
      get_business_billing: { Args: { _business_id: string }; Returns: { status: Database["public"]["Enums"]["billing_status"]; provider: string; default_currency: string; last4: string | null; brand: string | null; payment_configured: boolean }[] }
      get_business_verification: { Args: { _business_id: string }; Returns: { status: Database["public"]["Enums"]["business_verification_status"]; legal_name: string; tax_id: string; country: string; legal_address: string; contact_email: string; reviewer_notes: string | null; submitted_at: string; reviewed_at: string | null }[] }
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      can_admin_community: {
        Args: { _cid: string; _uid: string }
        Returns: boolean
      }
      can_moderate_community: {
        Args: { _cid: string; _uid: string }
        Returns: boolean
      }
      can_view_post: {
        Args: { _post_id: string; _uid: string }
        Returns: boolean
      }
      can_view_story: {
        Args: { _story_id: string; _uid: string }
        Returns: boolean
      }
      get_community_role: {
        Args: { _cid: string; _uid: string }
        Returns: Database["public"]["Enums"]["community_role"]
      }
      get_or_create_direct_conversation: {
        Args: { _other_user: string }
        Returns: string
      }
      increment_post_views: { Args: { _post_id: string }; Returns: undefined }
      is_community_member: {
        Args: { _cid: string; _uid: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _cid: string; _uid: string }
        Returns: boolean
      }
      mark_conversation_read: { Args: { _cid: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      trending_hashtags: {
        Args: { _limit?: number }
        Returns: {
          tag: string
          uses: number
        }[]
      }
      unread_messages_count: { Args: never; Returns: number }
    }
    Enums: {
      ad_campaign_status: "draft" | "pending" | "active" | "paused" | "completed" | "rejected"
      ad_event_type: "impression" | "click" | "engagement" | "lead"
      ad_objective: "awareness" | "traffic" | "engagement" | "leads"
      business_member_role: "owner" | "admin" | "analyst"
      business_status: "active" | "suspended"
      business_verification_status: "pending" | "under_review" | "verified" | "rejected"
      ad_account_status: "pending" | "active" | "suspended" | "closed"
      billing_status: "incomplete" | "active" | "past_due" | "suspended"
      billing_transaction_status: "pending" | "authorized" | "paid" | "failed" | "refunded"
      community_role: "owner" | "admin" | "moderator" | "member"
      community_visibility: "publica" | "privada"
      friendship_status: "pending" | "accepted" | "rejected" | "blocked"
      invite_status: "pending" | "accepted" | "declined"
      join_request_status: "pending" | "approved" | "rejected"
      post_privacy: "publico" | "amigos" | "comunidade" | "rascunho"
      privacy_audience: "todos" | "amigos" | "ninguem"
      reaction_kind: "curtir" | "amei" | "interessante" | "engracado"
      story_media_type: "image" | "video"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ad_campaign_status: ["draft", "pending", "active", "paused", "completed", "rejected"],
      ad_event_type: ["impression", "click", "engagement", "lead"],
      ad_objective: ["awareness", "traffic", "engagement", "leads"],
      business_member_role: ["owner", "admin", "analyst"],
      business_status: ["active", "suspended"],
      business_verification_status: ["pending", "under_review", "verified", "rejected"],
      ad_account_status: ["pending", "active", "suspended", "closed"],
      billing_status: ["incomplete", "active", "past_due", "suspended"],
      billing_transaction_status: ["pending", "authorized", "paid", "failed", "refunded"],
      community_role: ["owner", "admin", "moderator", "member"],
      community_visibility: ["publica", "privada"],
      friendship_status: ["pending", "accepted", "rejected", "blocked"],
      invite_status: ["pending", "accepted", "declined"],
      join_request_status: ["pending", "approved", "rejected"],
      post_privacy: ["publico", "amigos", "comunidade", "rascunho"],
      privacy_audience: ["todos", "amigos", "ninguem"],
      reaction_kind: ["curtir", "amei", "interessante", "engracado"],
      story_media_type: ["image", "video"],
    },
  },
} as const
