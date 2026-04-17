import { apiDelete, apiGet, apiPost } from './client';

export interface BodyRecord {
  id: number;
  recordDate: string;
  weight: number | null;
  bodyFat: number | null;
}

export interface BodyTrend {
  startDate: string;
  endDate: string;
  records: BodyRecord[];
  weightChange: number | null;
  bodyFatChange: number | null;
}

export const saveBodyRecord = (data: { recordDate: string; weight?: number; bodyFat?: number }) =>
  apiPost<BodyRecord>('/body/records', data);

export const getBodyTrend = (startDate: string, endDate: string) =>
  apiGet<BodyTrend>('/body/records', { startDate, endDate });

export const deleteBodyRecord = (id: number) => apiDelete<void>(`/body/records/${id}`);
