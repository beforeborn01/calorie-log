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

export interface TrainingScheduleResponse {
  trainingWeekdays: number[];
  defaultIntensity: number;
  plan: Array<{ date: string; dayType: 1 | 2; trainingIntensity: number; overridden: boolean }>;
}

export const getCurrentGoal = () => apiGet<Goal>('/goals/current');
export const setGoal = (body: SetGoalBody) => apiPost<Goal>('/goals', body);
export const saveTrainingSchedule = (body: {
  trainingWeekdays: number[];
  defaultIntensity: 1 | 2 | 3;
}) => apiPost<void>('/goals/training-schedule', body);
export const getTrainingSchedule = (month?: string) =>
  apiGet<TrainingScheduleResponse>('/goals/training-schedule', month ? { month } : undefined);
