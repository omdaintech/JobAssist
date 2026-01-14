import { supabase } from '@/lib/supabase/client';
import type { Course, CourseWithInstructor, CourseFilters } from '@/types/course';

export const coursesApi = {
  // Get all published courses with optional filters
  async getCourses(filters?: CourseFilters): Promise<Course[]> {
    let query = supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.level && filters.level.length > 0) {
      query = query.in('level', filters.level);
    }

    if (filters?.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }

    if (filters?.format && filters.format.length > 0) {
      query = query.in('format', filters.format);
    }

    if (filters?.language) {
      query = query.eq('language', filters.language);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }

    // Apply price range filter on client side (if needed)
    let filteredData = data || [];
    if (filters?.priceRange) {
      filteredData = filteredData.filter(course => {
        const price = course.price_usd || 0;
        return price >= (filters.priceRange!.min || 0) &&
               price <= (filters.priceRange!.max || Infinity);
      });
    }

    return filteredData;
  },

  // Get featured courses
  async getFeaturedCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .eq('is_featured', true)
      .order('rating', { ascending: false })
      .limit(6);

    if (error) {
      console.error('Error fetching featured courses:', error);
      throw error;
    }

    return data || [];
  },

  // Get course by slug with instructor details
  async getCourseBySlug(slug: string): Promise<CourseWithInstructor | null> {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:profiles!instructor_id (
          id,
          full_name,
          avatar_url,
          bio
        )
      `)
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error) {
      console.error('Error fetching course:', error);
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as any;
  },

  // Get course by ID
  async getCourseById(id: string): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching course:', error);
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  },

  // Get course reviews
  async getCourseReviews(courseId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        user:profiles!user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('course_id', courseId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }

    return data || [];
  },

  // Submit a review
  async submitReview(courseId: string, userId: string, rating: number, comment?: string) {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        course_id: courseId,
        user_id: userId,
        rating,
        comment,
        is_approved: false, // Requires admin approval
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting review:', error);
      throw error;
    }

    return data;
  },

  // Get courses by category
  async getCoursesByCategory(category: string): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .eq('category', category)
      .order('rating', { ascending: false });

    if (error) {
      console.error('Error fetching courses by category:', error);
      throw error;
    }

    return data || [];
  },

  // Search courses
  async searchCourses(query: string): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('rating', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error searching courses:', error);
      throw error;
    }

    return data || [];
  },
};
