import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile } from '../types';
import { tokenStore } from '../api/client';

interface AuthState {
  initialized: boolean;
  authenticated: boolean;
  profile: UserProfile | null;
  hydrate: () => Promise<void>;
  setTokens: (access: string, refresh: string) => Promise<void>;
  setProfile: (p: UserProfile | null) => void;
  logout: () => Promise<void>;
}

const PROFILE_KEY = 'clog.profile';

export const useAuthStore = create<AuthState>((set) => ({
  initialized: false,
  authenticated: false,
  profile: null,
  hydrate: async () => {
    const token = await tokenStore.get();
    const pjson = await AsyncStorage.getItem(PROFILE_KEY);
    set({
      initialized: true,
      authenticated: !!token,
      profile: pjson ? (JSON.parse(pjson) as UserProfile) : null,
    });
  },
  setTokens: async (access: string, refresh: string) => {
    await tokenStore.set(access);
    await tokenStore.setRefresh(refresh);
    set({ authenticated: true });
  },
  setProfile: (p: UserProfile | null) => {
    if (p) AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    else AsyncStorage.removeItem(PROFILE_KEY);
    set({ profile: p });
  },
  logout: async () => {
    await tokenStore.clear();
    await AsyncStorage.removeItem(PROFILE_KEY);
    set({ authenticated: false, profile: null });
  },
}));
