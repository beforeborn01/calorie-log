import { apiGet, apiPost } from './client';

export interface WechatQrCode {
  ticket: string;
  qrCodeUrl: string;
  mocked: boolean;
  expiresAt: string;
}

export interface WechatPollResponse {
  status: 'PENDING' | 'SCANNED' | 'CONFIRMED' | 'EXPIRED';
  nickname: string | null;
  token: {
    accessToken: string;
    refreshToken: string;
    profileComplete: boolean;
  } | null;
}

export const getWechatQrCode = () => apiGet<WechatQrCode>('/auth/wechat/qrcode');

export const pollWechat = (ticket: string) =>
  apiGet<WechatPollResponse>('/auth/wechat/poll', { ticket });

/**
 * Dev-only：模拟扫码确认。
 * 生产环境 RN 应使用 react-native-wechat-lib 原生 SDK 发起 WeChat OAuth，
 * 然后用 code 换取 openid → 后端走 /auth/wechat/login（尚未实现）。
 */
export const mockConfirmWechat = (ticket: string, targetUserId?: number) => {
  const qs = new URLSearchParams({ ticket });
  if (targetUserId != null) qs.set('targetUserId', String(targetUserId));
  return apiPost<void>(`/auth/wechat/mock-confirm?${qs.toString()}`);
};
