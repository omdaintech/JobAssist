import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setIsLoading: (isLoading) => set({ isLoading }),
      clearAuth: () => set({ user: null, profile: null, isLoading: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ profile: state.profile }), // Only persist profile
    }
  )
);
