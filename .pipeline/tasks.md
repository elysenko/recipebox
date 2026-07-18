# Pipeline Task Decomposition

## Summary
A full-stack TypeScript meal-planner delivered as a single Docker image. A NestJS + Prisma/SQLite API with JWT auth serves both `/api` and the built React + Vite SPA. Authenticated users manage recipes (with ingredients and ordered steps), assign recipes to a Monday-anchored weekly meal plan (7 days × 3 slots), and view an auto-aggregated shopping list that merges ingredients across planned meals with persisted check-off state. Auth model is `full_auth`: signup/login/logout with the first-ever user becoming ADMIN; admins additionally get a users listing.

## Surface contract
Routes (all deep-linkable):
- `/login` (public) — email/password login.
- `/signup` (public) — create account; first-ever user becomes ADMIN.
- `/` → redirect to `/recipes`.
- `/recipes` (guarded) — recipe collection; search via `?q=`.
- `/recipes/new` (guarded) — create form.
- `/recipes/:id` (guarded) — detail (all ingredients + ordered steps).
- `/recipes/:id/edit` (guarded) — edit form.
- `/plan` (guarded) — current week grid; assign dialog via `?modal=assign&day=<0-6>&slot=<slot>`.
- `/shopping-list` (guarded) — merged/alphabetical list with checkboxes.
- `/admin/users` (guarded + ADMIN) — all users table.
- `/admin/settings` (guarded + ADMIN) — backing-service credential configuration.
- `*` → NotFound.

API endpoints:
- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`.
- `GET /api/users` (ADMIN only).
- `GET /api/recipes?q=`, `POST /api/recipes`, `GET /api/recipes/:id`, `PUT /api/recipes/:id`, `DELETE /api/recipes/:id`.
- `GET /api/plan?weekStart=`, `PUT /api/plan/entry`, `DELETE /api/plan/entry/:id`.
- `GET /api/shopping-list?weekStart=`, `PUT /api/shopping-list/check`.
- `GET /api/admin/settings` (ADMIN), `PATCH /api/admin/settings` (ADMIN).
- `GET /api/health`, `GET /api/health/deep` (public).

Entities: `User`, `Recipe`, `Ingredient`, `Step`, `PlanEntry`, `ShoppingCheck`, `SystemSetting`.

## db_agent tasks
- [ ] Create `server/prisma/schema.prisma` with SQLite provider and `DATABASE_URL` from env.
- [ ] Define `User { id, email @unique, passwordHash, role UserRole @default(USER), createdAt }`.
- [ ] Define `enum UserRole { ADMIN USER }` (full_auth: default USER, first signup promoted to ADMIN in backend).
- [ ] Define `Recipe { id, userId, title, servings Int, tags String (JSON string array), createdAt, ingredients[], steps[] }` with relation to `User`.
- [ ] Define `Ingredient { id, recipeId, name, quantity Float, unit, position }` ordered by `position`.
- [ ] Define `Step { id, recipeId, position, text }` ordered by `position`.
- [ ] Define `PlanEntry { id, userId, weekStart, dayIndex (0-6), slot (BREAKFAST|LUNCH|DINNER), recipeId, @@unique([userId, weekStart, dayIndex, slot]) }` (model `slot` as an enum or string per spec).
- [ ] Define `ShoppingCheck { id, userId, weekStart, itemKey, checked Boolean, @@unique([userId, weekStart, itemKey]) }`.
- [ ] Define `SystemSetting { key String @id, value String, updatedAt DateTime @updatedAt }` (admin settings storage for postgresql, minio credentials).
- [ ] Generate the initial Prisma migration for all models.
- [ ] Create `server/prisma/seed.ts` — idempotent upsert-by-email of demo `admin@recipebox.test` (ADMIN) and `cook@recipebox.test` (USER), password `password123` bcrypt-hashed, plus one sample recipe ("Lemon Pasta", 5 ingredients / 4 steps) owned by the cook.

## backend_agent tasks
- [ ] Scaffold NestJS server: `server/package.json`, `tsconfig.json`, `nest-cli.json`, `src/main.ts` (global `ValidationPipe`, CORS), `src/app.module.ts`, `src/prisma/prisma.service.ts` + `prisma.module.ts`.
- [ ] Implement `src/health/health.controller.ts` — public `GET /api/health` and `GET /api/health/deep` (DB ping).
- [ ] Implement auth module (`src/auth/`): `auth.service.ts`, `auth.controller.ts` with `POST /api/auth/signup` (bcrypt hash; first-ever user → ADMIN, subsequent → USER), `POST /api/auth/login` (issue JWT with `sub` + `role`), `GET /api/auth/me`; `jwt.strategy.ts`, DTOs with class-validator.
- [ ] Implement `JwtAuthGuard` applied globally with a `@Public()` decorator exempting `/api/health`, `/api/health/deep`, `/api/auth/login`, `/api/auth/signup`.
- [ ] Implement `RolesGuard` + `@Roles()` decorator for ADMIN-only endpoints.
- [ ] Implement `src/users/users.controller.ts` — `GET /api/users` (ADMIN only) returning email, role, createdAt.
- [ ] Implement recipes module (`src/recipes/`): CRUD scoped to `req.user.id`; `GET /api/recipes?q=` filters by title OR tag containing `q` (case-insensitive); nested transactional create/update of ingredients + steps; return recipe with relations ordered by `position`; DTOs.
- [ ] Implement plan module (`src/plan/`): `GET /api/plan?weekStart=` returns entries + joined recipe titles; `PUT /api/plan/entry` upserts on `(userId, weekStart, dayIndex, slot)`; `DELETE /api/plan/entry/:id` clears a slot.
- [ ] Implement shopping module (`src/shopping/`): aggregate week's plan → recipes → ingredients, merge by `itemKey = lower(name)+"|"+lower(unit)` summing quantities, sort alphabetically by name, join `ShoppingCheck` for `checked`; `PUT /api/shopping-list/check` upserts `{itemKey, checked}` for the week.
- [ ] Implement `server/src/lib/config.ts` with `resolveConfig(key: string): string | null` — reads `process.env[key]`; if absent or equals `PLACEHOLDER_CONFIGURE_IN_SETTINGS`, falls back to the `SystemSetting` DB row; returns null if neither is set.
- [ ] Implement admin settings API: `GET /api/admin/settings` (ADMIN — lists service keys for postgresql and minio with masked values + configured status) and `PATCH /api/admin/settings` (ADMIN — upsert key/value pairs into `SystemSetting`).
- [ ] Configure static hosting in `src/main.ts`: serve `server/client-dist` with SPA fallback to `index.html` for non-`/api` routes.

## ui_agent tasks
- [ ] Scaffold Vite React-TS client: `client/package.json`, `vite.config.ts` (dev proxy `/api` → server), `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx` (React Router).
- [ ] Implement `src/auth/AuthContext.tsx` (loads `me` on boot, stores/clears JWT in localStorage), `RequireAuth.tsx` (redirect to `/login`), `RequireAdmin.tsx` (role check).
- [ ] Implement `LoginPage.tsx` (`/login`) and `SignupPage.tsx` (`/signup`) as part of the main app (full_auth).
- [ ] Implement `NavBar.tsx` with logout; admin links (`/admin/users`, `/admin/settings`) visible only to ADMIN users.
- [ ] Implement `RecipeListPage.tsx` (`/recipes`) bound to `?q=` search box with empty/loading/error states.
- [ ] Implement `RecipeDetailPage.tsx` (`/recipes/:id`) rendering all ingredients + ordered steps.
- [ ] Implement `RecipeEditPage.tsx` (`/recipes/new` + `/recipes/:id/edit`) with `RecipeForm.tsx` and dynamic `IngredientRow.tsx` for ingredient/step rows.
- [ ] Implement `PlanPage.tsx` (`/plan`) — 7-day × 3-slot grid for current `weekStart`; `AssignMealModal.tsx` opened via `?modal=assign&day=<0-6>&slot=<slot>` recipe picker.
- [ ] Implement `ShoppingListPage.tsx` (`/shopping-list`) — merged/alphabetical items with checkboxes; checked items struck-through.
- [ ] Implement `AdminUsersPage.tsx` (`/admin/users`) — ADMIN-guarded table of all users (email, role, createdAt).
- [ ] Implement `/admin/settings` page — lists postgresql and minio with configured/unconfigured badges and per-service credential forms. (No `<placeholder_services>`/`<placeholder_integrations>` provided, so no activation banner required.)
- [ ] Implement `NotFound.tsx` (`*`) and `src/lib/week.ts` Monday-anchored `weekStart` helper.

## service_agent tasks
- [ ] Implement `client/src/api/client.ts` — fetch wrapper injecting JWT from localStorage and handling 401/403.
- [ ] Wire auth flows (signup/login/logout/me) to the auth API via AuthContext.
- [ ] Wire recipes data layer (list with `?q=`, detail, create, update, delete) using `@tanstack/react-query`.
- [ ] Wire plan data layer (`GET /api/plan?weekStart=`, `PUT /api/plan/entry`, `DELETE /api/plan/entry/:id`) with cache invalidation so assignments restore on reload.
- [ ] Wire shopping-list data layer (`GET /api/shopping-list?weekStart=`, `PUT /api/shopping-list/check`) with optimistic check toggling.
- [ ] Wire admin data layer (`GET /api/users`, `GET /api/admin/settings`, `PATCH /api/admin/settings`).

## tester tasks
- [ ] Auth: seeded USER logs in → lands on `/recipes`; first signup → ADMIN; guarded route while logged out → redirect `/login`; non-admin hitting `/admin/users` → blocked.
- [ ] Recipes: create "Lemon Pasta" (5 ingredients / 4 steps) → appears in list, detail shows all; search `pasta` → only title/tag matches returned.
- [ ] Plan: assign Lemon Pasta to Wed dinner → shows in slot and persists after reload (verify via `GET /api/plan`).
- [ ] Shopping list: 3 meals planned → each ingredient once with summed quantities, alphabetical; merge verified for shared name+unit; check "lemons" → struck-through and still checked after reload.
- [ ] Admin settings: ADMIN can view postgresql/minio configured status and PATCH credentials; non-admin blocked from `GET/PATCH /api/admin/settings`.
- [ ] Health: `GET /api/health` → 200; `GET /api/health/deep` → DB-ok.
- [ ] Deploy/regression: Docker image builds; SPA deep links (e.g. `/recipes/:id`) resolve via static fallback.

## Open questions
- Admin settings scope: the spec does not describe an admin settings page, but the pipeline requires one because backing services (postgresql, minio) are provisioned. The spec's data model uses SQLite via `DATABASE_URL` while postgresql/minio are provisioned separately — confirm whether the app should actually connect to postgresql/minio (and what those credentials configure) or whether SQLite remains the runtime DB and the settings page is credential-management only.
- Which concrete credential keys should the settings page expose for postgresql (e.g. connection string) and minio (endpoint, access key, secret key, bucket)? No explicit env var keys were provided in the inputs.
- Non-normalized units ("tbsp" vs "tablespoon") won't merge per spec — confirm this is acceptable for tester assertions.
- SQLite persistence depends on a mounted volume in the deploy target; confirm the Colossus volume mount or whether to switch `DATABASE_URL` to postgresql.
