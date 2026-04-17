import { apiGet, apiPost } from './client';
import type { Food, PageResult } from '../types';

export const searchFood = (keyword: string, page = 1, size = 20) =>
  apiGet<PageResult<Food>>('/foods/search', { keyword, page, size });

export const getFood = (id: number) => apiGet<Food>(`/foods/${id}`);

export interface CreateFoodBody {
  name: string;
  alias?: string;
  category?: string;
  calories: number;
  protein?: number;
  carbohydrate?: number;
  fat?: number;
  dietaryFiber?: number;
  addedSugar?: number;
  isHardToWeigh?: boolean;
  grossNetRatio?: number;
  barcode?: string;
}

export const createCustomFood = (body: CreateFoodBody) =>
  apiPost<Food>('/foods/custom', body);
