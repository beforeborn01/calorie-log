import { apiDelete, apiGet, apiPost, apiPut } from './client';

export interface FriendSearch {
  userId: number;
  nickname: string;
  avatarUrl: string | null;
  maskedPhone: string;
  level: number;
  relation: 'self' | 'already_friend' | 'request_pending' | 'not_friend';
}

export interface FriendRequestItem {
  id: number;
  fromUserId: number;
  toUserId: number;
  fromNickname: string;
  toNickname: string;
  message: string | null;
  status: number;
  createdAt: string;
  handledAt: string | null;
  direction: 'incoming' | 'outgoing';
}

export interface Friend {
  friendshipId: number;
  friendUserId: number;
  nickname: string;
  avatarUrl: string | null;
  remark: string | null;
  level: number;
  totalExp: number;
  continuousDays: number;
  lastRecordDate: string | null;
  recordedToday: boolean;
  createdAt: string;
}

export interface Experience {
  userId: number;
  totalExp: number;
  level: number;
  continuousDays: number;
  lastRecordDate: string | null;
  expToNextLevel: number;
  currentLevelExp: number;
  nextLevelExp: number;
  levelProgress: number;
}

export interface ExpLog {
  id: number;
  expChange: number;
  reasonCode: string;
  reasonDetail: string | null;
  createdAt: string;
}

export interface RankingEntry {
  rank: number;
  userId: number;
  nickname: string;
  level: number;
  score: number;
  isSelf: boolean;
}

export interface RankingResponse {
  type: string;
  period: string;
  entries: RankingEntry[];
  self: RankingEntry | null;
  gapToPrevious: number;
}

export interface InviteLink {
  token: string;
  url: string;
  expiresAt: string;
}

export const searchUser = (phone: string) =>
  apiGet<FriendSearch>('/social/users/search', { phone });

export const sendFriendRequest = (toUserId: number, message?: string) =>
  apiPost<FriendRequestItem>('/social/friends/request', { toUserId, message });

export const listFriendRequests = (direction: 'incoming' | 'outgoing' = 'incoming') =>
  apiGet<FriendRequestItem[]>('/social/friends/requests', { direction });

export const handleFriendRequest = (id: number, action: 'accept' | 'reject') =>
  apiPut<FriendRequestItem>(`/social/friends/request/${id}`, { action });

export const listFriends = () => apiGet<Friend[]>('/social/friends');

export const deleteFriend = (friendId: number) =>
  apiDelete<void>(`/social/friends/${friendId}`);

export const setFriendRemark = (friendId: number, remark: string) =>
  apiPut<Friend>(`/social/friends/${friendId}/remark`, { remark });

export const getExperience = () => apiGet<Experience>('/social/experience');

export const getExpLogs = (limit = 30) =>
  apiGet<ExpLog[]>('/social/experience/logs', { limit });

export const getRanking = (
  type: 'exp' | 'score' | 'streak',
  period: 'all' | 'week' | 'month'
) => apiGet<RankingResponse>('/social/ranking', { type, period });

export const createInviteLink = () => apiGet<InviteLink>('/social/invite-link');

export const acceptInvite = (token: string) =>
  apiPost<number>('/social/invite/accept', { token });
