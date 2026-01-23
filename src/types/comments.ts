export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          notification_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          avatar_url?: string | null
          notification_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          notification_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          author_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          author_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      comment_mentions: {
        Row: {
          id: string
          comment_id: string
          mentioned_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          mentioned_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          mentioned_user_id?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          comment_id: string
          post_id: string
          is_read: boolean
          email_sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          comment_id: string
          post_id: string
          is_read?: boolean
          email_sent?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          comment_id?: string
          post_id?: string
          is_read?: boolean
          email_sent?: boolean
          created_at?: string
        }
      }
    }
  }
}

// Helper types
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type CommentMention = Database['public']['Tables']['comment_mentions']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Extended types with relations
export type CommentWithAuthor = Comment & {
  author: UserProfile
  mentions?: UserProfile[]
}
