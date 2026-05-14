// 训练模块前端 API（合并自 sports 项目）
// 后端路径前缀：/api/v1/training/*

import { apiDelete, apiGet, apiPost, apiPut } from './client';

// ======== Exercise ========
export interface TrainingExercise {
  id: number;
  name: string;
  bodyPart: string;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  difficulty: number;
  instructions: string;
  tips: string;
  isCustom: boolean;
  isPopular: boolean;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const listExercises = (all = false) =>
  apiGet<TrainingExercise[]>('/training/exercises', { all });
export const searchExercises = (params: {
  q?: string;
  category?: string;
  all?: boolean;
  limit?: number;
}) => apiGet<TrainingExercise[]>('/training/exercises/search', params);
export const getExercise = (id: number) => apiGet<TrainingExercise>(`/training/exercises/${id}`);
export const createCustomTrainingExercise = (data: {
  name: string;
  category: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  difficulty?: number;
  instructions?: string;
  tips?: string;
}) => apiPost<TrainingExercise>('/training/exercises', data);
export const updateTrainingExercise = (id: number, data: Partial<TrainingExercise>) =>
  apiPut<TrainingExercise>(`/training/exercises/${id}`, data);
export const deleteTrainingExercise = (id: number) =>
  apiDelete<void>(`/training/exercises/${id}`);

// ======== Plan ========
export interface PlanExercise {
  exerciseId: number;
  exerciseName?: string;
  bodyPart?: string;
  sets: number;
  reps?: number;
  weight?: number;
  restSeconds: number;
  notes?: string;
  sortOrder?: number;
}

export interface WorkoutPlan {
  id: number;
  name: string;
  description?: string;
  type: string;
  estimatedDuration?: number;
  isTemplate: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  exercises: PlanExercise[];
}

export const listPlans = () => apiGet<WorkoutPlan[]>('/training/plans');
export const getPlan = (id: number) => apiGet<WorkoutPlan>(`/training/plans/${id}`);
export const createPlan = (data: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt' | 'version'>) =>
  apiPost<WorkoutPlan>('/training/plans', data);
export const updatePlan = (id: number, data: Partial<WorkoutPlan>) =>
  apiPut<WorkoutPlan>(`/training/plans/${id}`, data);
export const deletePlan = (id: number) => apiDelete<void>(`/training/plans/${id}`);

// ======== Session ========
export interface CompletedSet {
  setNumber: number;
  reps: number;
  weight: number;
  rpe?: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface ExerciseSession {
  exerciseId: number;
  exerciseName?: string;
  plannedSets: number;
  notes?: string;
  completedSets: CompletedSet[];
}

export interface WorkoutSession {
  id: number;
  planId?: number;
  name: string;
  status: 'planned' | 'in_progress' | 'completed' | 'aborted' | 'active';
  startTime: string;
  endTime?: string;
  duration?: number;
  totalVolume?: number;
  notes?: string;
  source?: 'plan' | 'manual' | 'quick_log';
  rawText?: string;
  createdAt?: string;
  updatedAt?: string;
  exercises: ExerciseSession[];
}

export interface FinishSessionResponse {
  session: WorkoutSession;
  newPersonalRecords: Record<string, { weight: number; date: string }>;
}

export const listSessions = (page = 1, size = 20) =>
  apiGet<WorkoutSession[]>('/training/sessions', { page, size });
export const getSession = (id: number) => apiGet<WorkoutSession>(`/training/sessions/${id}`);
export const getActiveSession = () => apiGet<WorkoutSession | null>('/training/sessions/active');
export const createSession = (data: Omit<WorkoutSession, 'id' | 'createdAt' | 'updatedAt'>) =>
  apiPost<WorkoutSession>('/training/sessions', data);
export const updateSession = (id: number, data: Partial<WorkoutSession>) =>
  apiPut<WorkoutSession>(`/training/sessions/${id}`, data);
export const finishSession = (id: number, data: { endTime?: string; duration?: number; notes?: string }) =>
  apiPost<FinishSessionResponse>(`/training/sessions/${id}/finish`, data);
export const abortSession = (id: number) =>
  apiPost<WorkoutSession>(`/training/sessions/${id}/abort`, {});
export const deleteSession = (id: number) => apiDelete<void>(`/training/sessions/${id}`);

// ======== Stats ========
export interface UserStatsResponse {
  totalWorkouts: number;
  totalVolume: number;
  currentStreak: number;
  longestStreak: number;
  weeklyAverage: number;
  lastWorkoutDate?: string;
  updatedAt?: string;
  personalRecords: Record<string, { weight: number; date: string }>;
  /** 今日运动总消耗 kcal */
  todayExerciseCalories?: number;
  /** 今日净赤字 = TDEE + 运动消耗 - 饮食卡（正=赤字、负=盈余） */
  todayNetDeficit?: number;
}

export const getTrainingStats = () => apiGet<UserStatsResponse>('/training/stats');

// ======== QuickLog (自然语言补录) ========
export interface QuickLogResponse {
  session: WorkoutSession;
  newExercises: TrainingExercise[];
  notes: string[];
}

export const quickLog = (text: string, occurredAt?: string) =>
  apiPost<QuickLogResponse>('/training/sessions/quick-log', { text, occurredAt });
