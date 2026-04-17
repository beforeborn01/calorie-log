import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '../types';
import { tokenStore } from '../api/client';

interface AuthState {
  profile: UserProfile | null;
  setTokens: (access: string, refresh: string) => void;
  setProfile: (profile: UserProfile | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: null,
      setTokens: (access: string, refresh: string) => {
        tokenStore.set(access);
        tokenStore.setRefresh(refresh);
      },
      setProfile: (profile) => set({ profile }),
      logout: () => {
        tokenStore.clear();
        set({ profile: null });
      },
    }),
    { name: 'clog-auth' }
  )
);
