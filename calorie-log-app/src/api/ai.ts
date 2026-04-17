import { apiDelete, apiGet, apiPost } from './client';

export interface RecognizeCandidate {
  name: string;
  probability: number;
  foodId: number | null;
  caloriesPer100g: number | null;
  category: string | null;
  needManualQuantity: boolean;
}

export interface RecognizeResponse {
  imageHash: string;
  fromCache: boolean;
  mocked: boolean;
  candidates: RecognizeCandidate[];
}

export interface CookingMethod {
  name: string;
  fitGoals: string[];
  steps: string[];
  advantages: string;
  caloriesPer100g: number;
  oilPerServingG: number;
  durationMinutes: number;
  tags: string[];
}

export interface CookingSuggestionResponse {
  foodName: string;
  goalType: 'bulk' | 'cut' | 'general';
  fromCache: boolean;
  llmGenerated: boolean;
  methods: CookingMethod[];
}

export interface CookingFavorite {
  id: number;
  foodName: string;
  cookingMethod: string;
  content: string;
  createdAt: string;
}

export const recognizeFood = (imageBase64: string) =>
  apiPost<RecognizeResponse>('/foods/recognize', { imageBase64 });

export const getCookingSuggestions = (foodName: string, preferences?: string) =>
  apiPost<CookingSuggestionResponse>('/foods/cooking-suggestions', { foodName, preferences });

export const listFavorites = () => apiGet<CookingFavorite[]>('/cooking-favorites');

export const addFavorite = (foodName: string, method: CookingMethod) =>
  apiPost<CookingFavorite>('/cooking-favorites', {
    foodName,
    cookingMethod: method.name,
    content: JSON.stringify(method),
  });

export const deleteFavorite = (id: number) => apiDelete<void>(`/cooking-favorites/${id}`);
