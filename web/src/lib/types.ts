import type { Slot } from './week';

export type Role = 'ADMIN' | 'USER';

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  position: number;
}

export interface Step {
  id: string;
  position: number;
  text: string;
}

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  servings: number;
  tags: string[];
  ingredients: Ingredient[];
  steps: Step[];
  createdAt: string;
}

export interface PlanEntry {
  id: string;
  weekStart: string;
  dayIndex: number;
  slot: Slot;
  recipeId: string;
  recipeTitle: string;
}

export interface ShoppingItem {
  itemKey: string;
  name: string;
  unit: string;
  quantity: number;
  checked: boolean;
}

export interface ServiceSetting {
  service: 'postgresql' | 'minio';
  label: string;
  fields: { key: string; label: string; value: string; secret: boolean; configured: boolean }[];
  configured: boolean;
}
