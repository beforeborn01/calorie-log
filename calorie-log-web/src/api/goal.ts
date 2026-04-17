import { apiGet, apiPost } from './client';

export interface Goal {
  id: number;
  goalType: 1 | 2;
  goalTypeLabel: string;
  bmr: number;
  tdeeBase: number;
  targetCaloriesTraining: number;
  targetCaloriesRest: number;
  proteinRatio: number;
  carbRatio: number;
  fatRatio: number;
  startedAt: string;
}

export interface SetGoalBody {
  goalType: 1 | 2;
  targetCaloriesTraining?: number;
  targetCaloriesRest?: number;
  proteinRatio?: number;
  carbRatio?: number;
  fatRatio?: number;
}

export interface TrainingScheduleRequest {
  trainingWeekdays?: number[];
  defaultIntensity?: 1 | 2 | 3;
  exceptions?: Array<{
    exceptionDate: string;
    dayType: 1 | 2;
    trainingIntensity?: 1 | 2 | 3;
    note?: string;
  }>;
}

export interface DayPlan {
  date: string;
  dayType: 1 | 2;
  trainingIntensity: number;
  overridden: boolean;
}

export interface TrainingScheduleResponse {
  trainingWeekdays: number[];
  defaultIntensity: number;
  plan: DayPlan[];
}

export interface MealDistribution {
  date: string;
  dayType: 1 | 2 | null;
  targetCalories: number;
  meals: Array<{
    mealType: 1 | 2 | 3 | 4;
    label: string;
    ratio: number;
    minCalories: number;
    maxCalories: number;
    midCalories: number;
  }>;
}

export const getCurrentGoal = () => apiGet<Goal>('/goals/current');
export const setGoal = (body: SetGoalBody) => apiPost<Goal>('/goals', body);
export const saveTrainingSchedule = (body: TrainingScheduleRequest) =>
  apiPost<void>('/goals/training-schedule', body);
export const getTrainingSchedule = (month?: string) =>
  apiGet<TrainingScheduleResponse>('/goals/training-schedule', month ? { month } : undefined);
export const getMealDistribution = (date?: string) =>
  apiGet<MealDistribution>('/goals/meal-distribution', date ? { date } : undefined);
