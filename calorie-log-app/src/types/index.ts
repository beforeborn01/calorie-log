export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  userId: number;
  profileComplete: boolean;
}

export interface UserProfile {
  id: number;
  phone: string | null;
  email: string | null;
  nickname: string;
  avatarUrl: string | null;
  gender: number | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  activityLevel: number | null;
  timezone: string;
  profileComplete: boolean;
  wechatBound: boolean;
}

export interface Food {
  id: number;
  name: string;
  alias: string | null;
  barcode: string | null;
  category: string | null;
  unit: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  dietaryFiber: number | null;
  addedSugar: number | null;
  isHardToWeigh: boolean;
  grossNetRatio: number | null;
  dataSource: string;
}

export type MealType = 1 | 2 | 3 | 4;

export interface DietRecord {
  id: number;
  recordDate: string;
  mealType: MealType;
  foodId: number | null;
  foodName: string;
  quantity: number;
  grossQuantity: number | null;
  calories: number;
  protein: number | null;
  carbohydrate: number | null;
  fat: number | null;
  dietaryFiber: number | null;
  addedSugar: number | null;
  addMethod: number;
}

export interface DailyRecords {
  date: string;
  breakfast: DietRecord[];
  lunch: DietRecord[];
  dinner: DietRecord[];
  snacks: DietRecord[];
  totalCalories: number;
  totalProtein: number;
  totalCarb: number;
  totalFat: number;
  totalFiber: number;
  targetCalories: number;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
}
