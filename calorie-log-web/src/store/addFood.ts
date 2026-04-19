import { create } from 'zustand';
import type { MealType } from '../types';

interface AddFoodState {
  open: boolean;
  date: string;
  mealType: MealType;
  openModal: (date: string, mealType: MealType) => void;
  closeModal: () => void;
}

export const useAddFoodStore = create<AddFoodState>((set) => ({
  open: false,
  date: '',
  mealType: 1,
  openModal: (date, mealType) => set({ open: true, date, mealType }),
  closeModal: () => set({ open: false }),
}));

export const FOOD_ADDED_EVENT = 'clog:food-added';

export function emitFoodAdded(date: string) {
  window.dispatchEvent(new CustomEvent(FOOD_ADDED_EVENT, { detail: { date } }));
}
