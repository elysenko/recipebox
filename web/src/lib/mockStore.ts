// budget: 400 lines
// -----------------------------------------------------------------------------
// API DATA LAYER
// Real client for the RecipeBox FastAPI backend (auth, recipes, plan, shopping
// list, admin). Every function calls the live `/api/...` endpoints via ./api.ts;
// the request/response shapes match web/src/lib/types.ts one-to-one. The file
// name is kept for import stability across pages — there is no mock data here.
// -----------------------------------------------------------------------------
import type { User, Recipe, PlanEntry, ShoppingItem, ServiceSetting } from './types';
import type { Slot } from './week';
import { api } from './api';

const SESSION_KEY = 'recipebox_session_user';

interface AuthResponse {
  token: string;
  user: User;
}

// ---- session (JWT + cached user in localStorage) ----
export function currentSession(): User | null {
  try {
    if (!localStorage.getItem('token')) return null;
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function setSession(token: string | null, user: User | null) {
  if (token && user) {
    localStorage.setItem('token', token);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem('token');
    localStorage.removeItem(SESSION_KEY);
  }
}

// ---- auth ----
export async function login(email: string, password: string): Promise<User> {
  const res = await api<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  setSession(res.token, res.user);
  return res.user;
}

export async function signup(email: string, password: string): Promise<User> {
  const res = await api<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  setSession(res.token, res.user);
  return res.user;
}

export function logout() {
  setSession(null, null);
}

export async function listUsers(): Promise<User[]> {
  return api<User[]>('/api/users');
}

// ---- recipes ----
export async function listRecipes(q?: string): Promise<Recipe[]> {
  const query = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  return api<Recipe[]>(`/api/recipes${query}`);
}

export async function getRecipe(id: string): Promise<Recipe> {
  return api<Recipe>(`/api/recipes/${id}`);
}

export interface RecipeInput {
  title: string;
  servings: number;
  tags: string[];
  ingredients: { name: string; quantity: number; unit: string }[];
  steps: { text: string }[];
}

export async function createRecipe(input: RecipeInput): Promise<Recipe> {
  return api<Recipe>('/api/recipes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateRecipe(id: string, input: RecipeInput): Promise<Recipe> {
  return api<Recipe>(`/api/recipes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteRecipe(id: string): Promise<void> {
  await api(`/api/recipes/${id}`, { method: 'DELETE' });
}

// ---- plan ----
export async function getPlan(weekStart: string): Promise<PlanEntry[]> {
  return api<PlanEntry[]>(`/api/plan?weekStart=${encodeURIComponent(weekStart)}`);
}

export async function putPlanEntry(
  weekStart: string,
  dayIndex: number,
  slot: Slot,
  recipeId: string,
): Promise<void> {
  await api('/api/plan/entry', {
    method: 'PUT',
    body: JSON.stringify({ weekStart, dayIndex, slot, recipeId }),
  });
}

export async function deletePlanEntry(id: string): Promise<void> {
  await api(`/api/plan/entry/${id}`, { method: 'DELETE' });
}

// ---- shopping list ----
export async function getShoppingList(weekStart: string): Promise<ShoppingItem[]> {
  return api<ShoppingItem[]>(`/api/shopping-list?weekStart=${encodeURIComponent(weekStart)}`);
}

export async function checkShoppingItem(
  weekStart: string,
  itemKey: string,
  checked: boolean,
): Promise<void> {
  await api('/api/shopping-list/check', {
    method: 'PUT',
    body: JSON.stringify({ weekStart, itemKey, checked }),
  });
}

// ---- admin settings ----
export async function getSettings(): Promise<ServiceSetting[]> {
  return api<ServiceSetting[]>('/api/admin/settings');
}

export async function patchSettings(values: Record<string, string>): Promise<void> {
  await api('/api/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}
