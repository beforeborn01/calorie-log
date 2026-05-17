import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '../types';
import { tokenStore } from '../api/client';
import { postToMiniprogram } from '../utils/wxBridge';

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
        // 在小程序里登出时通知壳清 storage 并跳回登录页（浏览器里 no-op）
        postToMiniprogram({ type: 'logout' });
      },
    }),
    { name: 'clog-auth' }
  )
);
