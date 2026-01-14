import { supabase } from './client';
import type { AuthError, User } from '@supabase/supabase-js';

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  country?: string;
  language?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export const authService = {
  // Sign up new user
  async signUp(data: SignUpData): Promise<{ user: User | null; error: AuthError | null }> {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          country: data.country,
          preferred_language: data.language || 'en',
        },
      },
    });

    if (error) return { user: null, error };

    // Create profile
    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: data.email,
        full_name: data.fullName,
        country: data.country,
        preferred_language: data.language || 'en',
        role: 'student',
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    return { user: authData.user, error: null };
  },

  // Sign in existing user
  async signIn(data: SignInData): Promise<{ user: User | null; error: AuthError | null }> {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    return { user: authData?.user || null, error };
  },

  // Sign out
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current session
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Reset password
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  },

  // Update password
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  },

  // OAuth sign in (Google, GitHub, etc.)
  async signInWithOAuth(provider: 'google' | 'github' | 'azure') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  },
};
