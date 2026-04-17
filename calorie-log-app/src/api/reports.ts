import { apiGet } from './client';

export interface DayPoint {
  date: string;
  calories: number | null;
  calorieGap: number | null;
  dietScore: number | null;
  weight: number | null;
  bodyFat: number | null;
}

export interface PeriodReport {
  period: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  daysWithRecords: number | null;
  avgCalories: number | null;
  avgProtein: number | null;
  avgCarb: number | null;
  avgFat: number | null;
  avgFiber: number | null;
  avgCalorieGap: number | null;
  avgDietScore: number | null;
  weightStart: number | null;
  weightEnd: number | null;
  weightChange: number | null;
  bodyFatStart: number | null;
  bodyFatEnd: number | null;
  bodyFatChange: number | null;
  strengthTrainingDays: number | null;
  strengthTotalSets: number | null;
  strengthTotalReps: number | null;
  strengthTotalVolume: number | null;
  bestDate: string | null;
  bestDietScore: number | null;
  worstDate: string | null;
  worstDietScore: number | null;
  dailyPoints: DayPoint[];
  conclusion: string | null;
}

export const getWeekly = (startDate: string) =>
  apiGet<PeriodReport>('/statistics/weekly', { startDate });

export const getMonthly = (yearMonth: string) =>
  apiGet<PeriodReport>('/statistics/monthly', { yearMonth });
