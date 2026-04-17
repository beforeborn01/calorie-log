import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'clog.accessToken';
const REFRESH_KEY = 'clog.refreshToken';

export const tokenStore = {
  get: () => AsyncStorage.getItem(TOKEN_KEY),
  set: (t: string) => AsyncStorage.setItem(TOKEN_KEY, t),
  getRefresh: () => AsyncStorage.getItem(REFRESH_KEY),
  setRefresh: (t: string) => AsyncStorage.setItem(REFRESH_KEY, t),
  clear: () => Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(REFRESH_KEY)]),
};

export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  unauthorizedHandler = fn;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStore.get();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  config.headers.set('X-Timezone', 'Asia/Shanghai');
  return config;
});

let refreshing: Promise<string | null> | null = null;
async function tryRefresh(): Promise<string | null> {
  const refreshToken = await tokenStore.getRefresh();
  if (!refreshToken) return null;
  if (!refreshing) {
    refreshing = axios
      .post<ApiResult<{ accessToken: string; refreshToken: string }>>(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      })
      .then(async (resp) => {
        if (resp.data.code === 200 && resp.data.data?.accessToken) {
          await tokenStore.set(resp.data.data.accessToken);
          await tokenStore.setRefresh(resp.data.data.refreshToken);
          return resp.data.data.accessToken;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (resp) => {
    const data = resp.data as ApiResult<unknown>;
    if (data && typeof data.code === 'number' && data.code !== 200) {
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    return resp;
  },
  async (error: AxiosError<ApiResult<unknown>>) => {
    const status = error.response?.status;
    const config = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    if (status === 401 && config && !config._retried) {
      config._retried = true;
      const newToken = await tryRefresh();
      if (newToken) {
        config.headers?.set('Authorization', `Bearer ${newToken}`);
        return api.request(config);
      }
      await tokenStore.clear();
      unauthorizedHandler?.();
    }
    const msg = error.response?.data?.message || error.message || '网络错误';
    return Promise.reject(new Error(msg));
  }
);

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const resp = await api.get<ApiResult<T>>(url, { params });
  return resp.data.data;
}
export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const resp = await api.post<ApiResult<T>>(url, body);
  return resp.data.data;
}
export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const resp = await api.put<ApiResult<T>>(url, body);
  return resp.data.data;
}
export async function apiDelete<T>(url: string): Promise<T> {
  const resp = await api.delete<ApiResult<T>>(url);
  return resp.data.data;
}

export default api;
