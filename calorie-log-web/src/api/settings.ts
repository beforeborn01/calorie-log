import { apiGet, apiPut, apiPost } from './client';

export interface NotificationSetting {
  breakfastEnabled: boolean;
  breakfastTime: string;
  lunchEnabled: boolean;
  lunchTime: string;
  dinnerEnabled: boolean;
  dinnerTime: string;
  frequency: 'daily' | 'weekday' | 'weekend';
}

export const getNotificationSetting = () =>
  apiGet<NotificationSetting>('/settings/notifications');

export const saveNotificationSetting = (data: Partial<NotificationSetting>) =>
  apiPut<NotificationSetting>('/settings/notifications', data);

export const changePassword = (oldPassword: string, newPassword: string) =>
  apiPut<void>('/users/password', { oldPassword, newPassword });

export const resetPassword = (identifier: string, verifyCode: string, newPassword: string) =>
  apiPost<void>('/auth/reset-password', { identifier, verifyCode, newPassword });
