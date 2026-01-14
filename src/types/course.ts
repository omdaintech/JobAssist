import type { Database } from './database';

export type Course = Database['public']['Tables']['courses']['Row'];
export type CourseInsert = Database['public']['Tables']['courses']['Insert'];
export type CourseUpdate = Database['public']['Tables']['courses']['Update'];

export type CourseLevel = Database['public']['Enums']['course_level'];
export type CourseFormat = Database['public']['Enums']['course_format'];

export interface CourseWithInstructor extends Course {
  instructor?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
  };
  reviews_count?: number;
}

export interface CourseFilters {
  level?: CourseLevel[];
  category?: string[];
  format?: CourseFormat[];
  priceRange?: {
    min: number;
    max: number;
  };
  search?: string;
  language?: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  duration_minutes: number | null;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  order_index: number;
  resources: any;
  is_preview: boolean;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress_percentage: number;
  certificate_url: string | null;
  course?: Course;
}

export interface CourseProgress {
  enrollment_id: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
  last_accessed: string | null;
}
