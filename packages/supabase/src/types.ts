export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TransactionType =
  | "topup"
  | "consume"
  | "refund"
  | "hold"
  | "release";

export type NotificationChannel = "in_app" | "email" | "push";

export type DiaryVisibility = "private" | "followers" | "public";
export type DiaryCommentSource = "user" | "ai" | "counselor" | "moderator";
export type DiaryReactionType = "cheer" | "hug" | "empathy" | "insight";
export type DiaryAiCommentStatus = "idle" | "pending" | "processing" | "completed" | "failed";
export type LearningLessonStatus = "locked" | "in_progress" | "completed";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type SlotStatus = "available" | "held" | "booked" | "unavailable";
export type IntroChatStatus = "open" | "resolved" | "closed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          role: string;
          onboarding_state: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          onboarding_state?: Json;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          onboarding_state?: Json;
          updated_at?: string;
        };
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          balance_cents: number;
          currency: string;
          status: "active" | "locked";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance_cents?: number;
          currency?: string;
          status?: "active" | "locked";
        };
        Update: {
          balance_cents?: number;
          currency?: string;
          status?: "active" | "locked";
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          wallet_id: string;
          user_id: string;
          type: TransactionType;
          amount_cents: number;
          balance_after_cents: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          wallet_id: string;
          user_id: string;
          type: TransactionType;
          amount_cents: number;
          balance_after_cents: number;
          metadata?: Json;
        };
        Update: {
          metadata?: Json;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          channel: NotificationChannel;
          type: string;
          title: string | null;
          body: string | null;
          data: Json;
          read_at: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          channel?: NotificationChannel;
          type: string;
          title?: string | null;
          body?: string | null;
          data?: Json;
          read_at?: string | null;
          sent_at?: string | null;
        };
        Update: {
          read_at?: string | null;
          sent_at?: string | null;
          title?: string | null;
          body?: string | null;
          data?: Json;
        };
      };
      notification_preferences: {
        Row: {
          user_id: string;
          channel: NotificationChannel;
          enabled: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          channel: NotificationChannel;
          enabled?: boolean;
        };
        Update: {
          enabled?: boolean;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity: string | null;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity?: string | null;
          entity_id?: string | null;
          metadata?: Json;
        };
        Update: Record<string, never>;
      };
      notification_deliveries: {
        Row: {
          id: string;
          notification_id: string;
          channel: NotificationChannel;
          external_reference: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          notification_id: string;
          channel: NotificationChannel;
          external_reference?: string | null;
          status?: string;
        };
        Update: {
          status?: string;
          external_reference?: string | null;
        };
      };
      michelle_sessions: {
        Row: {
          id: string;
          auth_user_id: string;
          category: Database["public"]["Enums"]["michelle_session_category"];
          title: string | null;
          openai_thread_id: string | null;
          total_tokens: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          category: Database["public"]["Enums"]["michelle_session_category"];
          title?: string | null;
          openai_thread_id?: string | null;
          total_tokens?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string;
          category?: Database["public"]["Enums"]["michelle_session_category"];
          title?: string | null;
          openai_thread_id?: string | null;
          total_tokens?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      michelle_messages: {
        Row: {
          id: string;
          session_id: string;
          role: Database["public"]["Enums"]["michelle_message_role"];
          content: string;
          tokens_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: Database["public"]["Enums"]["michelle_message_role"];
          content: string;
          tokens_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          session_id?: string;
          role?: Database["public"]["Enums"]["michelle_message_role"];
          content?: string;
          tokens_used?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      michelle_knowledge: {
        Row: {
          id: string;
          content: string;
          embedding: number[] | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          embedding?: number[] | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          embedding?: number[] | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      michelle_knowledge_parents: {
        Row: {
          id: string;
          content: string;
          source: string;
          parent_index: number;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          source: string;
          parent_index: number;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          source?: string;
          parent_index?: number;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      michelle_knowledge_children: {
        Row: {
          id: string;
          parent_id: string;
          content: string;
          embedding: number[] | null;
          child_index: number;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          content: string;
          embedding?: number[] | null;
          child_index: number;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          parent_id?: string;
          content?: string;
          embedding?: number[] | null;
          child_index?: number;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      emotion_diary_entries: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          content: string;
          mood_score: number | null;
          mood_label: string | null;
          mood_color: string | null;
          energy_level: number | null;
          visibility: DiaryVisibility;
          ai_comment_status: DiaryAiCommentStatus;
          ai_summary: string | null;
          ai_highlights: Json;
          published_at: string | null;
          journal_date: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          content: string;
          mood_score?: number | null;
          mood_label?: string | null;
          mood_color?: string | null;
          energy_level?: number | null;
          visibility?: DiaryVisibility;
          ai_comment_status?: DiaryAiCommentStatus;
          ai_summary?: string | null;
          ai_highlights?: Json;
          published_at?: string | null;
          journal_date?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          user_id?: string;
          title?: string | null;
          content?: string;
          mood_score?: number | null;
          mood_label?: string | null;
          mood_color?: string | null;
          energy_level?: number | null;
          visibility?: DiaryVisibility;
          ai_comment_status?: DiaryAiCommentStatus;
          ai_summary?: string | null;
          ai_highlights?: Json;
          published_at?: string | null;
          journal_date?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      emotion_diary_entry_feelings: {
        Row: {
          entry_id: string;
          label: string;
          intensity: number;
          tone: string | null;
          created_at: string;
        };
        Insert: {
          entry_id: string;
          label: string;
          intensity?: number;
          tone?: string | null;
          created_at?: string;
        };
        Update: {
          intensity?: number;
          tone?: string | null;
          created_at?: string;
        };
      };
      emotion_diary_comments: {
        Row: {
          id: string;
          entry_id: string;
          commenter_user_id: string | null;
          source: DiaryCommentSource;
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          entry_id: string;
          commenter_user_id?: string | null;
          source?: DiaryCommentSource;
          content: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          entry_id?: string;
          commenter_user_id?: string | null;
          source?: DiaryCommentSource;
          content?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      emotion_diary_reactions: {
        Row: {
          entry_id: string;
          user_id: string;
          reaction_type: DiaryReactionType;
          created_at: string;
        };
        Insert: {
          entry_id: string;
          user_id: string;
          reaction_type: DiaryReactionType;
          created_at?: string;
        };
        Update: {
          reaction_type?: DiaryReactionType;
          created_at?: string;
        };
      };
      learning_courses: {
        Row: {
          id: string;
          slug: string;
          title: string;
          subtitle: string | null;
          description: string | null;
          hero_url: string | null;
          level: string | null;
          tags: string[] | null;
          total_duration_seconds: number | null;
          published: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          subtitle?: string | null;
          description?: string | null;
          hero_url?: string | null;
          level?: string | null;
          tags?: string[] | null;
          total_duration_seconds?: number | null;
          published?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          title?: string;
          subtitle?: string | null;
          description?: string | null;
          hero_url?: string | null;
          level?: string | null;
          tags?: string[] | null;
          total_duration_seconds?: number | null;
          published?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      learning_course_modules: {
        Row: {
          id: string;
          course_id: string;
          order_index: number;
          title: string;
          summary: string | null;
          is_required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          order_index: number;
          title: string;
          summary?: string | null;
          is_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          order_index?: number;
          title?: string;
          summary?: string | null;
          is_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      learning_lessons: {
        Row: {
          id: string;
          module_id: string;
          slug: string;
          order_index: number;
          title: string;
          summary: string | null;
          video_url: string | null;
          video_duration_seconds: number | null;
          requires_quiz: boolean;
          transcript: string | null;
          resources: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          slug: string;
          order_index: number;
          title: string;
          summary?: string | null;
          video_url?: string | null;
          video_duration_seconds?: number | null;
          requires_quiz?: boolean;
          transcript?: string | null;
          resources?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          module_id?: string;
          slug?: string;
          order_index?: number;
          title?: string;
          summary?: string | null;
          video_url?: string | null;
          video_duration_seconds?: number | null;
          requires_quiz?: boolean;
          transcript?: string | null;
          resources?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      learning_lesson_progress: {
        Row: {
          user_id: string;
          lesson_id: string;
          status: LearningLessonStatus;
          last_position_seconds: number;
          unlocked_at: string | null;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          lesson_id: string;
          status?: LearningLessonStatus;
          last_position_seconds?: number;
          unlocked_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          status?: LearningLessonStatus;
          last_position_seconds?: number;
          unlocked_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      learning_lesson_notes: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      learning_quizzes: {
        Row: {
          id: string;
          lesson_id: string;
          passing_score: number;
          questions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          passing_score?: number;
          questions: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          lesson_id?: string;
          passing_score?: number;
          questions?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      learning_quiz_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          lesson_id: string;
          user_id: string;
          score: number;
          total_questions: number;
          answers: Json;
          passed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          lesson_id: string;
          user_id: string;
          score: number;
          total_questions: number;
          answers: Json;
          passed?: boolean;
          created_at?: string;
        };
        Update: {
          score?: number;
          total_questions?: number;
          answers?: Json;
          passed?: boolean;
          created_at?: string;
        };
      };
      counselors: {
        Row: {
          id: string;
          auth_user_id: string;
          slug: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          specialties: string[] | null;
          hourly_rate_cents: number;
          intro_video_url: string | null;
          is_active: boolean;
          profile_metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          slug: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          specialties?: string[] | null;
          hourly_rate_cents?: number;
          intro_video_url?: string | null;
          is_active?: boolean;
          profile_metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string;
          slug?: string;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          specialties?: string[] | null;
          hourly_rate_cents?: number;
          intro_video_url?: string | null;
          is_active?: boolean;
          profile_metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      counselor_slots: {
        Row: {
          id: string;
          counselor_id: string;
          start_time: string;
          end_time: string;
          status: SlotStatus;
          held_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          counselor_id: string;
          start_time: string;
          end_time: string;
          status?: SlotStatus;
          held_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          counselor_id?: string;
          start_time?: string;
          end_time?: string;
          status?: SlotStatus;
          held_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      counselor_bookings: {
        Row: {
          id: string;
          slot_id: string;
          counselor_id: string;
          client_user_id: string;
          status: BookingStatus;
          price_cents: number;
          currency: string;
          notes: string | null;
          intro_chat_id: string | null;
          payment_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slot_id: string;
          counselor_id: string;
          client_user_id: string;
          status?: BookingStatus;
          price_cents: number;
          currency?: string;
          notes?: string | null;
          intro_chat_id?: string | null;
          payment_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slot_id?: string;
          counselor_id?: string;
          client_user_id?: string;
          status?: BookingStatus;
          price_cents?: number;
          currency?: string;
          notes?: string | null;
          intro_chat_id?: string | null;
          payment_status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      counselor_intro_chats: {
        Row: {
          id: string;
          booking_id: string;
          status: IntroChatStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          status?: IntroChatStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          status?: IntroChatStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      counselor_intro_messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_user_id: string;
          body: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_user_id: string;
          body: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          chat_id?: string;
          sender_user_id?: string;
          body?: string;
          role?: string;
          created_at?: string;
        };
      };
      counselor_booking_payments: {
        Row: {
          id: string;
          booking_id: string;
          transaction_id: string | null;
          amount_cents: number;
          status: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          transaction_id?: string | null;
          amount_cents: number;
          status?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          booking_id?: string;
          transaction_id?: string | null;
          amount_cents?: number;
          status?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      emotion_diary_feed_reactions: {
        Row: {
          entry_id: string;
          user_id: string;
          reaction_type: string;
          created_at: string;
        };
        Insert: {
          entry_id: string;
          user_id: string;
          reaction_type: string;
          created_at?: string;
        };
        Update: {
          reaction_type?: string;
          created_at?: string;
        };
      };
      emotion_diary_reports: {
        Row: {
          id: string;
          entry_id: string;
          reporter_user_id: string;
          reason: string;
          status: string;
          created_at: string;
          resolved_at: string | null;
          resolution_note: string | null;
        };
        Insert: {
          id?: string;
          entry_id: string;
          reporter_user_id: string;
          reason: string;
          status?: string;
          created_at?: string;
          resolved_at?: string | null;
          resolution_note?: string | null;
        };
        Update: {
          entry_id?: string;
          reporter_user_id?: string;
          reason?: string;
          status?: string;
          created_at?: string;
          resolved_at?: string | null;
          resolution_note?: string | null;
        };
      };
      emotion_diary_moderation_log: {
        Row: {
          id: string;
          entry_id: string;
          moderator_user_id: string | null;
          action: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entry_id: string;
          moderator_user_id?: string | null;
          action: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          entry_id?: string;
          moderator_user_id?: string | null;
          action?: string;
          note?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      perform_wallet_transaction: {
        Args: {
          p_user_id: string;
          p_amount_cents: number;
          p_is_credit: boolean;
          p_type: TransactionType;
          p_metadata?: Json | null;
        };
        Returns: Database["public"]["Tables"]["transactions"]["Row"];
      };
      enqueue_notification: {
        Args: {
          p_user_id: string;
          p_channel: NotificationChannel;
          p_type: string;
          p_title?: string | null;
          p_body?: string | null;
          p_data?: Json | null;
        };
        Returns: Database["public"]["Tables"]["notifications"]["Row"];
      };
      match_michelle_knowledge: {
        Args: {
          query_embedding: number[];
          match_count?: number;
          similarity_threshold?: number;
        };
        Returns: {
          id: string;
          content: string;
          metadata: Json | null;
          similarity: number;
        }[];
      };
      match_michelle_knowledge_sinr: {
        Args: {
          query_embedding: number[];
          match_count?: number;
          similarity_threshold?: number;
        };
        Returns: {
          parent_id: string;
          parent_content: string;
          parent_metadata: Json | null;
          parent_source: string;
          child_similarity: number;
        }[];
      };
    };
    Enums: {
      michelle_session_category: "love" | "life" | "relationship";
      michelle_message_role: "user" | "assistant" | "system";
      diary_visibility: DiaryVisibility;
      diary_comment_source: DiaryCommentSource;
      diary_reaction_type: DiaryReactionType;
      diary_ai_comment_status: DiaryAiCommentStatus;
      learning_lesson_status: LearningLessonStatus;
      booking_status: BookingStatus;
      slot_status: SlotStatus;
      intro_chat_status: IntroChatStatus;
    };
  };
}
