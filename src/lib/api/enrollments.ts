import { supabase } from '@/lib/supabase/client';
import type { Enrollment } from '@/types/course';

export const enrollmentsApi = {
  // Enroll user in a course
  async enrollInCourse(userId: string, courseId: string, paymentId?: string) {
    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        payment_id: paymentId,
        progress_percentage: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error enrolling in course:', error);
      throw error;
    }

    // Update course total_students count
    await supabase.rpc('increment_course_students', { course_id: courseId });

    return data;
  },

  // Get user enrollments
  async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:courses (*)
      `)
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.error('Error fetching enrollments:', error);
      throw error;
    }

    return data as any;
  },

  // Check if user is enrolled in a course
  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking enrollment:', error);
      return false;
    }

    return !!data;
  },

  // Get enrollment by ID
  async getEnrollment(enrollmentId: string) {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:courses (*)
      `)
      .eq('id', enrollmentId)
      .single();

    if (error) {
      console.error('Error fetching enrollment:', error);
      throw error;
    }

    return data;
  },

  // Update enrollment progress
  async updateProgress(enrollmentId: string, progressPercentage: number) {
    const { data, error } = await supabase
      .from('enrollments')
      .update({ progress_percentage: progressPercentage })
      .eq('id', enrollmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating progress:', error);
      throw error;
    }

    return data;
  },

  // Mark course as completed
  async completeCourse(enrollmentId: string, certificateUrl?: string) {
    const { data, error } = await supabase
      .from('enrollments')
      .update({
        completed_at: new Date().toISOString(),
        progress_percentage: 100,
        certificate_url: certificateUrl,
      })
      .eq('id', enrollmentId)
      .select()
      .single();

    if (error) {
      console.error('Error completing course:', error);
      throw error;
    }

    return data;
  },

  // Get course progress statistics for a user
  async getCourseProgress(enrollmentId: string) {
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('enrollment_id', enrollmentId);

    if (error) {
      console.error('Error fetching progress:', error);
      throw error;
    }

    const completed = data?.filter(p => p.completed).length || 0;
    const total = data?.length || 0;

    return {
      total_lessons: total,
      completed_lessons: completed,
      progress_percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  },

  // Mark lesson as completed
  async markLessonComplete(enrollmentId: string, lessonId: string, timeSpentMinutes: number) {
    const { data, error } = await supabase
      .from('lesson_progress')
      .upsert({
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
        time_spent_minutes: timeSpentMinutes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error marking lesson complete:', error);
      throw error;
    }

    return data;
  },
};
