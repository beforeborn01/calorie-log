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

/** Dev-only: 模拟扫码确认。targetUserId 省略则绑定第一个可用账号。 */
export const mockConfirmWechat = (ticket: string, targetUserId?: number) => {
  const params = new URLSearchParams({ ticket });
  if (targetUserId != null) params.set('targetUserId', String(targetUserId));
  return apiPost<void>(`/auth/wechat/mock-confirm?${params.toString()}`);
};
