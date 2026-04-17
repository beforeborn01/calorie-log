import { apiDelete, apiGet, apiPost, apiPut } from './client';
import type { DailyRecords, DietRecord, MealType } from '../types';

export interface CreateRecordBody {
  recordDate: string;
  mealType: MealType;
  foodId?: number;
  foodName?: string;
  quantity?: number;
  grossQuantity?: number;
  calories?: number;
  protein?: number;
  carbohydrate?: number;
  fat?: number;
  dietaryFiber?: number;
  addedSugar?: number;
  addMethod?: number;
}

export interface UpdateRecordBody extends Partial<CreateRecordBody> {}

export const getDailyRecords = (date: string) =>
  apiGet<DailyRecords>('/records/daily', { date });

export const createRecord = (body: CreateRecordBody) =>
  apiPost<DietRecord>('/records', body);

export const updateRecord = (id: number, body: UpdateRecordBody) =>
  apiPut<DietRecord>(`/records/${id}`, body);

export const deleteRecord = (id: number) => apiDelete<void>(`/records/${id}`);
