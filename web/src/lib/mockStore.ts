// -----------------------------------------------------------------------------
// MOCKUP DATA LAYER
// A self-contained, localStorage-backed store that emulates the RecipeBox API
// (auth, recipes, plan, shopping list, admin) so the preview is fully
// interactive and persists across reloads. When the real NestJS API is wired
// in, replace these calls with `api('/api/...')` from ./api.ts — the shapes match.
// -----------------------------------------------------------------------------
import type { User, Recipe, PlanEntry, ShoppingItem, ServiceSetting } from './types';
import type { Slot } from './week';

const DB_KEY = 'recipebox_mock_db_v1';
const SESSION_KEY = 'recipebox_session_user';

interface DB {
  users: (User & { password: string })[];
  recipes: Recipe[];
  plan: Omit<PlanEntry, 'recipeTitle'>[];
  checks: Record<string, boolean>; // key: `${weekStart}|${itemKey}`
  settings: Record<string, string>;
}

let idc = 1;
const uid = (p: string) => `${p}_${Date.now().toString(36)}${(idc++).toString(36)}`;

function seed(): DB {
  const now = new Date();
  const iso = (offsetDays: number) =>
    new Date(now.getTime() - offsetDays * 86400000).toISOString();
  const cookId = 'user_cook';
  const adminId = 'user_admin';
  return {
    users: [
      { id: adminId, email: 'admin@recipebox.test', password: 'password123', role: 'ADMIN', createdAt: iso(30) },
      { id: cookId, email: 'cook@recipebox.test', password: 'password123', role: 'USER', createdAt: iso(20) },
    ],
    recipes: [
      {
        id: 'recipe_lemon_pasta',
        userId: cookId,
        title: 'Lemon Pasta',
        servings: 4,
        tags: ['pasta', 'vegetarian', 'quick'],
        createdAt: iso(10),
        ingredients: [
          { id: 'i1', name: 'Spaghetti', quantity: 400, unit: 'g', position: 0 },
          { id: 'i2', name: 'Lemons', quantity: 2, unit: 'whole', position: 1 },
          { id: 'i3', name: 'Parmesan', quantity: 60, unit: 'g', position: 2 },
          { id: 'i4', name: 'Olive oil', quantity: 3, unit: 'tbsp', position: 3 },
          { id: 'i5', name: 'Garlic', quantity: 2, unit: 'clove', position: 4 },
        ],
        steps: [
          { id: 's1', position: 0, text: 'Bring a large pot of salted water to a boil and cook the spaghetti until al dente.' },
          { id: 's2', position: 1, text: 'Meanwhile, zest and juice the lemons; grate the parmesan.' },
          { id: 's3', position: 2, text: 'Gently warm olive oil with sliced garlic, then stir in lemon juice and zest.' },
          { id: 's4', position: 3, text: 'Toss drained pasta with the sauce and parmesan; season and serve.' },
        ],
      },
      {
        id: 'recipe_garden_salad',
        userId: cookId,
        title: 'Garden Salad',
        servings: 2,
        tags: ['salad', 'vegetarian', 'quick'],
        createdAt: iso(6),
        ingredients: [
          { id: 'g1', name: 'Lemons', quantity: 1, unit: 'whole', position: 0 },
          { id: 'g2', name: 'Mixed greens', quantity: 200, unit: 'g', position: 1 },
          { id: 'g3', name: 'Cherry tomatoes', quantity: 150, unit: 'g', position: 2 },
          { id: 'g4', name: 'Olive oil', quantity: 2, unit: 'tbsp', position: 3 },
        ],
        steps: [
          { id: 'gs1', position: 0, text: 'Wash and dry the greens and halve the tomatoes.' },
          { id: 'gs2', position: 1, text: 'Whisk olive oil with the juice of one lemon.' },
          { id: 'gs3', position: 2, text: 'Toss everything together and season to taste.' },
        ],
      },
    ],
    plan: [
      { id: 'plan_seed_1', weekStart: '', dayIndex: 2, slot: 'DINNER', recipeId: 'recipe_lemon_pasta' },
    ],
    checks: {},
    settings: {},
  };
}

function load(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch { /* ignore */ }
  const fresh = seed();
  persist(fresh);
  return fresh;
}
function persist(db: DB) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

const wait = <T>(v: T, ms = 220): Promise<T> =>
  new Promise((r) => setTimeout(() => r(v), ms));

function stripPw(u: User & { password: string }): User {
  const { password: _pw, ...rest } = u;
  return rest;
}

// ---- session ----
export function currentSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}
function setSession(u: User | null) {
  if (u) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    localStorage.setItem('token', `mock.${u.id}`);
  } else {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('token');
  }
}

// ---- auth ----
export async function login(email: string, password: string): Promise<User> {
  const db = load();
  const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u || u.password !== password) throw new Error('Invalid email or password');
  const user = stripPw(u);
  setSession(user);
  return wait(user);
}

export async function signup(email: string, password: string): Promise<User> {
  const db = load();
  if (db.users.some((x) => x.email.toLowerCase() === email.trim().toLowerCase()))
    throw new Error('An account with that email already exists');
  const role = db.users.length === 0 ? 'ADMIN' : 'USER'; // first-ever user → ADMIN
  const rec = {
    id: uid('user'),
    email: email.trim(),
    password,
    role: role as User['role'],
    createdAt: new Date().toISOString(),
  };
  db.users.push(rec);
  persist(db);
  const user = stripPw(rec);
  setSession(user);
  return wait(user);
}

export function logout() {
  setSession(null);
}

export async function listUsers(): Promise<User[]> {
  const db = load();
  return wait(db.users.map(stripPw).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
}

// ---- recipes ----
export async function listRecipes(q?: string): Promise<Recipe[]> {
  const db = load();
  const me = currentSession();
  let list = db.recipes.filter((r) => !me || r.userId === me.id);
  if (q && q.trim()) {
    const needle = q.trim().toLowerCase();
    list = list.filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        r.tags.some((t) => t.toLowerCase().includes(needle)),
    );
  }
  return wait(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function getRecipe(id: string): Promise<Recipe> {
  const db = load();
  const r = db.recipes.find((x) => x.id === id);
  if (!r) throw new Error('Recipe not found');
  return wait(r);
}

export interface RecipeInput {
  title: string;
  servings: number;
  tags: string[];
  ingredients: { name: string; quantity: number; unit: string }[];
  steps: { text: string }[];
}

export async function createRecipe(input: RecipeInput): Promise<Recipe> {
  const db = load();
  const me = currentSession();
  const rec: Recipe = {
    id: uid('recipe'),
    userId: me?.id ?? 'user_cook',
    title: input.title,
    servings: input.servings,
    tags: input.tags,
    createdAt: new Date().toISOString(),
    ingredients: input.ingredients.map((x, i) => ({ id: uid('i'), position: i, ...x })),
    steps: input.steps.map((x, i) => ({ id: uid('s'), position: i, text: x.text })),
  };
  db.recipes.push(rec);
  persist(db);
  return wait(rec);
}

export async function updateRecipe(id: string, input: RecipeInput): Promise<Recipe> {
  const db = load();
  const idx = db.recipes.findIndex((x) => x.id === id);
  if (idx < 0) throw new Error('Recipe not found');
  const prev = db.recipes[idx];
  const rec: Recipe = {
    ...prev,
    title: input.title,
    servings: input.servings,
    tags: input.tags,
    ingredients: input.ingredients.map((x, i) => ({ id: uid('i'), position: i, ...x })),
    steps: input.steps.map((x, i) => ({ id: uid('s'), position: i, text: x.text })),
  };
  db.recipes[idx] = rec;
  persist(db);
  return wait(rec);
}

export async function deleteRecipe(id: string): Promise<void> {
  const db = load();
  db.recipes = db.recipes.filter((x) => x.id !== id);
  db.plan = db.plan.filter((p) => p.recipeId !== id);
  persist(db);
  return wait(undefined);
}

// ---- plan ----
export async function getPlan(weekStart: string): Promise<PlanEntry[]> {
  const db = load();
  // migrate seed entry (weekStart '') to the requested week once
  const seedEntry = db.plan.find((p) => p.weekStart === '');
  if (seedEntry) {
    seedEntry.weekStart = weekStart;
    persist(db);
  }
  const entries = db.plan
    .filter((p) => p.weekStart === weekStart)
    .map((p) => {
      const r = db.recipes.find((x) => x.id === p.recipeId);
      return { ...p, recipeTitle: r?.title ?? 'Unknown recipe' } as PlanEntry;
    });
  return wait(entries);
}

export async function putPlanEntry(
  weekStart: string,
  dayIndex: number,
  slot: Slot,
  recipeId: string,
): Promise<void> {
  const db = load();
  const existing = db.plan.find(
    (p) => p.weekStart === weekStart && p.dayIndex === dayIndex && p.slot === slot,
  );
  if (existing) existing.recipeId = recipeId;
  else db.plan.push({ id: uid('plan'), weekStart, dayIndex, slot, recipeId });
  persist(db);
  return wait(undefined);
}

export async function deletePlanEntry(id: string): Promise<void> {
  const db = load();
  db.plan = db.plan.filter((p) => p.id !== id);
  persist(db);
  return wait(undefined);
}

// ---- shopping list ----
export async function getShoppingList(weekStart: string): Promise<ShoppingItem[]> {
  const db = load();
  const entries = db.plan.filter((p) => p.weekStart === weekStart);
  const merged = new Map<string, ShoppingItem>();
  for (const e of entries) {
    const r = db.recipes.find((x) => x.id === e.recipeId);
    if (!r) continue;
    for (const ing of r.ingredients) {
      const itemKey = `${ing.name.trim().toLowerCase()}|${ing.unit.trim().toLowerCase()}`;
      const prev = merged.get(itemKey);
      if (prev) prev.quantity += ing.quantity;
      else
        merged.set(itemKey, {
          itemKey,
          name: ing.name,
          unit: ing.unit,
          quantity: ing.quantity,
          checked: db.checks[`${weekStart}|${itemKey}`] ?? false,
        });
    }
  }
  const list = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
  return wait(list);
}

export async function checkShoppingItem(
  weekStart: string,
  itemKey: string,
  checked: boolean,
): Promise<void> {
  const db = load();
  db.checks[`${weekStart}|${itemKey}`] = checked;
  persist(db);
  return wait(undefined, 60);
}

// ---- admin settings ----
const SERVICE_DEFS: { service: 'postgresql' | 'minio'; label: string; fields: { key: string; label: string; secret: boolean }[] }[] = [
  {
    service: 'postgresql',
    label: 'PostgreSQL',
    fields: [
      { key: 'POSTGRES_URL', label: 'Connection URL', secret: true },
      { key: 'POSTGRES_DB', label: 'Database name', secret: false },
    ],
  },
  {
    service: 'minio',
    label: 'MinIO (Object storage)',
    fields: [
      { key: 'MINIO_ENDPOINT', label: 'Endpoint', secret: false },
      { key: 'MINIO_ACCESS_KEY', label: 'Access key', secret: false },
      { key: 'MINIO_SECRET_KEY', label: 'Secret key', secret: true },
      { key: 'MINIO_BUCKET', label: 'Bucket', secret: false },
    ],
  },
];

function maskValue(v: string, secret: boolean): string {
  if (!v) return '';
  if (!secret) return v;
  return v.length <= 4 ? '••••' : `${'•'.repeat(v.length - 4)}${v.slice(-4)}`;
}

export async function getSettings(): Promise<ServiceSetting[]> {
  const db = load();
  const out: ServiceSetting[] = SERVICE_DEFS.map((def) => {
    const fields = def.fields.map((f) => {
      const raw = db.settings[f.key] ?? '';
      return {
        key: f.key,
        label: f.label,
        value: maskValue(raw, f.secret),
        secret: f.secret,
        configured: !!raw,
      };
    });
    return {
      service: def.service,
      label: def.label,
      fields,
      configured: fields.every((f) => f.configured),
    };
  });
  return wait(out);
}

export async function patchSettings(values: Record<string, string>): Promise<void> {
  const db = load();
  for (const [k, v] of Object.entries(values)) {
    if (v && v.trim()) db.settings[k] = v.trim();
  }
  persist(db);
  return wait(undefined);
}

export function resetMockData() {
  localStorage.removeItem(DB_KEY);
  load();
}
