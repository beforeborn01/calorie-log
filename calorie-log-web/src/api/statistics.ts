import { apiGet } from './client';

export interface DailyStatistics {
  date: string;
  dayType: 1 | 2 | null;
  totalCalories: number;
  totalProtein: number;
  totalCarb: number;
  totalFat: number;
  totalFiber: number;
  tdee: number | null;
  targetCalories: number | null;
  calorieGap: number | null;
  calorieStatus: 'deficit' | 'surplus' | 'balanced' | 'unknown';
  statusHint: string;
  foodVarietyCount: number | null;
  dietScore: number | null;
}

export interface DietScore {
  date: string;
  totalScore: number;
  calorieScore: number;
  nutrientScore: number;
  mealDistributionScore: number;
  varietyScore: number;
  varietyCount: number;
  nutrientDetail: Record<string, number>;
}

export interface DietSuggestion {
  category: 'calorie' | 'nutrient' | 'meal_distribution' | 'variety';
  severity: 'info' | 'warn' | 'critical';
  title: string;
  detail: string;
  recommendedFoods: string[] | null;
}

export interface DietSuggestions {
  date: string;
  suggestions: DietSuggestion[];
}

export const getDailyStatistics = (date: string) =>
  apiGet<DailyStatistics>('/statistics/daily', { date });
export const getDietScore = (date: string) => apiGet<DietScore>('/statistics/score', { date });
export const getDietSuggestions = (date: string) =>
  apiGet<DietSuggestions>('/statistics/suggestions', { date });
