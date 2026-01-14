export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'student' | 'instructor' | 'admin';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseFormat = 'self-paced' | 'live' | 'hybrid';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentProvider = 'stripe' | 'paymob';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          preferred_language: string;
          country: string | null;
          phone: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          preferred_language?: string;
          country?: string | null;
          phone?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          preferred_language?: string;
          country?: string | null;
          phone?: string | null;
          bio?: string | null;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          long_description: string | null;
          level: CourseLevel;
          category: string | null;
          format: CourseFormat;
          duration_hours: number | null;
          price_usd: number | null;
          price_egp: number | null;
          price_sek: number | null;
          instructor_id: string | null;
          thumbnail_url: string | null;
          video_preview_url: string | null;
          is_published: boolean;
          is_featured: boolean;
          prerequisites: string[] | null;
          learning_outcomes: string[] | null;
          target_audience: string[] | null;
          certificate_included: boolean;
          language: string;
          rating: number;
          total_students: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description?: string | null;
          long_description?: string | null;
          level: CourseLevel;
          category?: string | null;
          format: CourseFormat;
          duration_hours?: number | null;
          price_usd?: number | null;
          price_egp?: number | null;
          price_sek?: number | null;
          instructor_id?: string | null;
          thumbnail_url?: string | null;
          video_preview_url?: string | null;
          is_published?: boolean;
          is_featured?: boolean;
          prerequisites?: string[] | null;
          learning_outcomes?: string[] | null;
          target_audience?: string[] | null;
          certificate_included?: boolean;
          language?: string;
          rating?: number;
          total_students?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          slug?: string;
          description?: string | null;
          long_description?: string | null;
          level?: CourseLevel;
          category?: string | null;
          format?: CourseFormat;
          duration_hours?: number | null;
          price_usd?: number | null;
          price_egp?: number | null;
          price_sek?: number | null;
          instructor_id?: string | null;
          thumbnail_url?: string | null;
          video_preview_url?: string | null;
          is_published?: boolean;
          is_featured?: boolean;
          prerequisites?: string[] | null;
          learning_outcomes?: string[] | null;
          target_audience?: string[] | null;
          certificate_included?: boolean;
          language?: string;
          rating?: number;
          total_students?: number;
          updated_at?: string;
        };
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          enrolled_at: string;
          completed_at: string | null;
          progress_percentage: number;
          certificate_url: string | null;
          payment_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          enrolled_at?: string;
          completed_at?: string | null;
          progress_percentage?: number;
          certificate_url?: string | null;
          payment_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          progress_percentage?: number;
          certificate_url?: string | null;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          currency: string;
          status: PaymentStatus;
          payment_method: string | null;
          payment_provider: PaymentProvider;
          provider_payment_id: string | null;
          course_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          currency: string;
          status?: PaymentStatus;
          payment_method?: string | null;
          payment_provider: PaymentProvider;
          provider_payment_id?: string | null;
          course_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          status?: PaymentStatus;
          provider_payment_id?: string | null;
          metadata?: Json | null;
        };
      };
      reviews: {
        Row: {
          id: string;
          course_id: string;
          user_id: string;
          rating: number;
          comment: string | null;
          is_approved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          user_id: string;
          rating: number;
          comment?: string | null;
          is_approved?: boolean;
          created_at?: string;
        };
        Update: {
          rating?: number;
          comment?: string | null;
          is_approved?: boolean;
        };
      };
      cart_items: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          added_at?: string;
        };
        Update: {
          // Cart items are typically not updated, only added or removed
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      course_level: CourseLevel;
      course_format: CourseFormat;
      payment_status: PaymentStatus;
      payment_provider: PaymentProvider;
    };
  };
}
