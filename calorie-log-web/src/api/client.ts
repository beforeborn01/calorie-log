import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import dayjs from 'dayjs';
import { message } from 'antd';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const TOKEN_KEY = 'clog_access_token';
const REFRESH_KEY = 'clog_refresh_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setRefresh: (t: string) => localStorage.setItem(REFRESH_KEY, t),
};

export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}

const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  config.headers.set('X-Timezone', tz);
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return null;
  if (!refreshing) {
    refreshing = axios
      .post<ApiResult<{ accessToken: string; refreshToken: string }>>(`${baseURL}/auth/refresh`, {
        refreshToken,
      })
      .then((resp) => {
        if (resp.data.code === 200 && resp.data.data?.accessToken) {
          tokenStore.set(resp.data.data.accessToken);
          tokenStore.setRefresh(resp.data.data.refreshToken);
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
    // 仅 JSON 响应走业务码检查；blob / arraybuffer 直接透传
    const data = resp.data;
    if (data && typeof (data as ApiResult<unknown>).code === 'number') {
      const result = data as ApiResult<unknown>;
      if (result.code !== 200) {
        // 业务错误唯一一次 toast
        message.error(result.message || '请求失败');
        return Promise.reject(new Error(result.message));
      }
    }
    return resp;
  },
  async (error: AxiosError<ApiResult<unknown>>) => {
    const status = error.response?.status;
    const config = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    if (status === 401 && !config._retried) {
      config._retried = true;
      const newToken = await tryRefresh();
      if (newToken) {
        config.headers?.set('Authorization', `Bearer ${newToken}`);
        // 续签成功：静默重放，不弹提示
        return api.request(config);
      }
      tokenStore.clear();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
        return Promise.reject(error); // 跳转即可，不再弹"网络错误"
      }
    }
    const msg = error.response?.data?.message || error.message || '网络错误';
    message.error(msg);
    return Promise.reject(error);
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

export const today = () => dayjs().format('YYYY-MM-DD');

export default api;
