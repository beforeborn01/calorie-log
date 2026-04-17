import { apiGet, apiPost } from './client';
import type { TokenResponse, UserProfile } from '../types';

export interface RegisterBody {
  identifier: string;
  verifyCode: string;
  password: string;
  nickname?: string;
}

export interface LoginBody {
  identifier: string;
  loginType: 'password' | 'code';
  password?: string;
  verifyCode?: string;
}

export const sendCode = (identifier: string, scene: 'register' | 'login' | 'reset_password' | 'wechat_bind') =>
  apiPost<{ sent: boolean; code?: string }>('/auth/send-code', { identifier, scene });

export const register = (body: RegisterBody) => apiPost<TokenResponse>('/auth/register', body);
export const login = (body: LoginBody) => apiPost<TokenResponse>('/auth/login', body);
export const logout = () => apiPost<void>('/auth/logout');
export const getProfile = () => apiGet<UserProfile>('/users/profile');
