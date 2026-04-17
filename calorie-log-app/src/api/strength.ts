import { apiDelete, apiGet, apiPost, apiPut } from './client';

export interface Exercise {
  id: number;
  name: string;
  bodyPart: string;
  isPreset: boolean;
}

export interface StrengthRecord {
  id: number;
  recordDate: string;
  exerciseId: number;
  exerciseName: string;
  bodyPart: string;
  sets: number;
  repsPerSet: number;
  weight: number | null;
  note: string | null;
}

export const listExercises = (params?: { bodyPart?: string; keyword?: string }) =>
  apiGet<Exercise[]>('/strength/exercises', params);

export const createCustomExercise = (data: { name: string; bodyPart: string }) =>
  apiPost<Exercise>('/strength/exercises/custom', data);

export const createStrengthRecord = (data: {
  recordDate: string;
  exerciseId: number;
  sets: number;
  repsPerSet: number;
  weight?: number;
  note?: string;
}) => apiPost<StrengthRecord>('/strength/records', data);

export const listStrengthRecords = (date: string) =>
  apiGet<StrengthRecord[]>('/strength/records', { date });

export const updateStrengthRecord = (
  id: number,
  data: { sets?: number; repsPerSet?: number; weight?: number; note?: string }
) => apiPut<StrengthRecord>(`/strength/records/${id}`, data);

export const deleteStrengthRecord = (id: number) => apiDelete<void>(`/strength/records/${id}`);
