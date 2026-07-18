# Test Specification

> ⚠️ **Warning:** `.pipeline/surface.json` was not found. The API/route surface below was derived from the inline spec and the "Surface contract" section of `.pipeline/tasks.md`. If an authoritative `surface.json` is produced later, reconcile this file against it. `requirements/spec.md` was also absent; the inline `<spec>` was used instead.

## Coverage summary
- Total cases: 78
- API endpoints covered: 18 / 18 (derived surface)
- User journeys covered: 12

Endpoint inventory (derived):
1. `POST /api/auth/signup`
2. `POST /api/auth/login`
3. `GET /api/auth/me`
4. `GET /api/users`
5. `GET /api/recipes`
6. `POST /api/recipes`
7. `GET /api/recipes/:id`
8. `PUT /api/recipes/:id`
9. `DELETE /api/recipes/:id`
10. `GET /api/plan`
11. `PUT /api/plan/entry`
12. `DELETE /api/plan/entry/:id`
13. `GET /api/shopping-list`
14. `PUT /api/shopping-list/check`
15. `GET /api/admin/settings`
16. `PATCH /api/admin/settings`
17. `GET /api/health`
18. `GET /api/health/deep`

---

## API tests

### `POST /api/auth/signup`
- **Happy path**: `{ email: "newcook@recipebox.test", password: "password123" }` on an empty user table → `201`, body `{ token: <jwt>, user: { id, email, role: "ADMIN" } }` (first-ever user is promoted to ADMIN). A second signup with a distinct email → role `USER`.
- **Validation failures**:
  - Missing `email` → `400`.
  - Malformed email (`"not-an-email"`) → `400`.
  - Missing / too-short `password` (empty string) → `400`.
  - Duplicate email (`admin@recipebox.test`, already seeded) → `409` (conflict on `email @unique`).
- **Auth failures**: N/A (public route).
- **Idempotency / edge cases**: Password is never returned in the body; response contains no `passwordHash`. JWT payload contains `sub` (user id) and `role`.

### `POST /api/auth/login`
- **Happy path**: `{ email: "cook@recipebox.test", password: "password123" }` (seeded USER) → `200`, body `{ token, user: { role: "USER" } }`. `admin@recipebox.test` / `password123` → `200`, role `ADMIN`.
- **Validation failures**: Missing `email` or `password` → `400`.
- **Auth failures**:
  - Correct email, wrong password → `401`.
  - Unknown email → `401` (same generic message — no user-existence disclosure).
- **Idempotency / edge cases**: Issued JWT decodes to the correct `sub` + `role`; body excludes `passwordHash`.

### `GET /api/auth/me`
- **Happy path**: Valid `Authorization: Bearer <token>` → `200`, body `{ id, email, role }` matching the token subject.
- **Validation failures**: N/A.
- **Auth failures**:
  - No `Authorization` header → `401`.
  - Malformed / expired / tampered token → `401`.
- **Idempotency / edge cases**: Response excludes `passwordHash`.

### `GET /api/users`
- **Happy path**: ADMIN token → `200`, array of `{ id, email, role, createdAt }` for all users (includes both seeded accounts). No `passwordHash` in any row.
- **Validation failures**: N/A.
- **Auth failures**:
  - No token → `401`.
  - Valid USER (non-admin) token → `403` (RolesGuard).
- **Idempotency / edge cases**: Row count equals total users in DB.

### `GET /api/recipes`
- **Happy path**: Authenticated user → `200`, array of that user's recipes only (scoped to `req.user.id`). Seeded cook sees "Lemon Pasta".
- **Query / search**:
  - `?q=pasta` → returns recipes whose title OR any tag contains `pasta`, case-insensitive (`?q=PASTA` returns the same).
  - `?q=` empty or absent → returns all of the user's recipes.
  - `?q=zzzznomatch` → `200` with `[]`.
- **Validation failures**: N/A (unmatched query is a valid empty result, not an error).
- **Auth failures**: No token → `401`.
- **Idempotency / edge cases**: A recipe owned by another user never appears in this user's list.

### `POST /api/recipes`
- **Happy path**: Authenticated user posts `{ title: "Lemon Pasta", servings: 2, tags: ["pasta","quick"], ingredients: [5 rows with name/quantity/unit/position], steps: [4 ordered rows] }` → `201`, returns the created recipe with `ingredients` and `steps` ordered by `position`, `userId` = caller.
- **Validation failures**:
  - Missing `title` → `400`.
  - `servings` not an integer / negative → `400`.
  - `ingredients` with missing `name` or non-numeric `quantity` → `400`.
  - `tags` not an array of strings → `400`.
- **Auth failures**: No token → `401`.
- **Idempotency / edge cases**: Nested ingredients + steps are created transactionally (partial failure creates no recipe). Returned relations are ordered by `position`.

### `GET /api/recipes/:id`
- **Happy path**: Owner requests own recipe → `200`, full recipe with all ingredients + ordered steps.
- **Validation failures**: Non-numeric / malformed `:id` → `400` (or `404` per implementation).
- **Auth failures**: No token → `401`.
- **Idempotency / edge cases**:
  - Unknown id → `404`.
  - Recipe owned by a different user → `404` (not `403`, to avoid ownership disclosure) — assert scoping.

### `PUT /api/recipes/:id`
- **Happy path**: Owner updates title/servings/tags and replaces ingredient + step rows → `200`, returns updated recipe; removed ingredient rows are gone, added rows present, all ordered by `position`.
- **Validation failures**: Same field validation as `POST` (bad `servings`, missing `title`, malformed ingredient) → `400`.
- **Auth failures**: No token → `401`.
- **Idempotency / edge cases**:
  - Updating another user's recipe → `404`.
  - Nested update runs in a transaction (invalid nested row leaves the original recipe unchanged).

### `DELETE /api/recipes/:id`
- **Happy path**: Owner deletes own recipe → `200`/`204`; subsequent `GET /api/recipes/:id` → `404`; ingredients + steps cascade-removed.
- **Validation failures**: Malformed `:id` → `400`/`404`.
- **Auth failures**: No token → `401`.
- **Idempotency / edge cases**:
  - Deleting another user's recipe → `404`.
  - Deleting an already-deleted / unknown id → `404`.

### `GET /api/plan`
- **Happy path**: `?weekStart=<current Monday ISO date>` with a token → `200`, array of entries `{ id, dayIndex, slot, recipeId, recipeTitle }` for that user+week; empty week → `[]`.
- **Validation failures**: Missing or malformed `weekStart` (not an ISO date) → `400`.
- **Auth failures**: No token → `401`.
- **Idempotency / edge cases**: Only the caller's entries are returned; joined recipe titles present.

### `PUT /api/plan/entry`
- **Happy path**: `{ weekStart, dayIndex: 2, slot: "DINNER", recipeId }` (Wednesday dinner) → `200`, entry persisted. Re-`PUT` same `(dayIndex, slot)` with a different `recipeId` → upserts (replaces, does not duplicate) per `@@unique([userId, weekStart, dayIndex, slot])`.
- **Validation failures**:
  - `dayIndex` outside 0–6 → `400`.
  - `slot` not in `BREAKFAST|LUNCH|DINNER` → `400`.
  - Missing `weekStart` / `recipeId` → `400`.
  - `recipeId` referencing a non-existent or non-owned recipe → `400`/`404`.
- **Auth failures**: No token → `401`.
- **Idempotency / edge cases**: Two `PUT`s to the same slot yield exactly one row (upsert, not insert).

### `DELETE /api/plan/entry/:id`
- **Happy path**: Owner deletes an existing plan entry → `200`/`204`; slot cleared; absent from next `GET /api/plan`.
- **Validation failures**: Malformed `:id` → `400`/`404`.
- **Auth failures**: No token → `401`.
- **Idempotency / edge cases**: Deleting another user's entry → `404`; deleting unknown id → `404`.

### `GET /api/shopping-list`
- **Happy path**: `?weekStart=<Monday>` with ≥1 planned meal → `200`, array of merged items `{ itemKey, name, quantity, unit, checked }` sorted alphabetically by `name`. Ingredients sharing normalized `name`+`unit` are merged with summed quantities; differing units stay as separate rows.
- **Validation failures**: Missing / malformed `weekStart` → `400`.
- **Auth failures**: No token → `401`.
- **Idempotency / edge cases**:
  - Empty plan → `[]`.
  - `itemKey` equals `lower(name)+"|"+lower(unit)`.
  - `checked` reflects any persisted `ShoppingCheck` for `(userId, weekStart, itemKey)`, defaulting to `false`.

### `PUT /api/shopping-list/check`
- **Happy path**: `{ weekStart, itemKey: "lemons|", checked: true }` → `200`; subsequent `GET /api/shopping-list` shows that item `checked: true`. Re-`PUT` `checked: false` toggles back.
- **Validation failures**: Missing `weekStart` / `itemKey`, or non-boolean `checked` → `400`.
- **Auth failures**: No token → `401`.
- **Idempotency / edge cases**: Upsert on `@@unique([userId, weekStart, itemKey])` — repeated `PUT`s do not create duplicate rows; state survives list regeneration.

### `GET /api/admin/settings`
- **Happy path**: ADMIN token → `200`, lists service keys for `postgresql` and `minio` with **masked** values and a `configured` boolean per key.
- **Validation failures**: N/A.
- **Auth failures**:
  - No token → `401`.
  - USER (non-admin) token → `403`.
- **Idempotency / edge cases**: Secret values are never returned in clear text (masked).

### `PATCH /api/admin/settings`
- **Happy path**: ADMIN token with `{ key: <service key>, value: <string> }` (or a batch of key/value pairs) → `200`; upserts into `SystemSetting`; a follow-up `GET /api/admin/settings` shows that key `configured: true`.
- **Validation failures**: Missing `key` or `value`, or unknown/unsupported key → `400`.
- **Auth failures**:
  - No token → `401`.
  - USER (non-admin) token → `403`.
- **Idempotency / edge cases**: Re-PATCHing an existing key updates in place (upsert on `key @id`), does not duplicate; `updatedAt` refreshes.

### `GET /api/health`
- **Happy path**: No auth → `200`, body indicating status ok (e.g. `{ status: "ok" }`).
- **Validation failures**: N/A.
- **Auth failures**: N/A — must remain public (no token required, no `401`).
- **Idempotency / edge cases**: Responds `200` even before login.

### `GET /api/health/deep`
- **Happy path**: No auth → `200` with DB-ok indicator (successful Prisma/SQLite ping).
- **Validation failures**: N/A.
- **Auth failures**: N/A — public route.
- **Idempotency / edge cases**: If the DB is unreachable, returns a non-200 (e.g. `503`) with a db-not-ok indicator.

---

## UI / journey tests

### Journey: Seeded user login
- **Steps**: Visit `/login` → type `cook@recipebox.test` / `password123` → submit.
- **Expected outcomes**: Redirect to `/recipes`; NavBar shows logout; JWT stored in localStorage; `GET /api/auth/me` reflects the logged-in user.
- **Negative path**: Wrong password → stays on `/login`, visible error message, no token stored.

### Journey: First-user signup becomes ADMIN
- **Steps**: On an empty user table, visit `/signup` → enter a new email + password → submit.
- **Expected outcomes**: Account created, logged in, redirected to `/recipes`; role is ADMIN; NavBar exposes admin links (`/admin/users`, `/admin/settings`). (In the seeded environment, assert the backend rule via API: first-ever signup → ADMIN, subsequent → USER.)
- **Negative path**: Duplicate email → stays on `/signup` with a conflict error; no session created.

### Journey: Route guarding + logout
- **Steps**: While logged out, navigate directly to `/recipes` (and `/plan`, `/shopping-list`).
- **Expected outcomes**: Redirected to `/login`. After logging in and clicking logout in NavBar, token is cleared and guarded routes redirect to `/login` again.
- **Negative path**: A non-admin USER navigating to `/admin/users` or `/admin/settings` is blocked (redirect away or "forbidden"), and admin links are hidden in their NavBar.

### Journey: Recipe list + search
- **Steps**: Logged-in cook opens `/recipes`; observe seeded "Lemon Pasta"; type `pasta` in the search box (URL becomes `/recipes?q=pasta`).
- **Expected outcomes**: List filters to title/tag matches only; clearing the box restores the full list. Empty/loading/error states render appropriately.
- **Negative path**: Search `zzzznomatch` → visible empty-state message, no rows.

### Journey: Create recipe
- **Steps**: `/recipes` → "New" → `/recipes/new`; fill title "Lemon Pasta", servings, tags; add 5 dynamic ingredient rows and 4 step rows; submit.
- **Expected outcomes**: Redirect to the new recipe's detail or list; recipe appears in `/recipes`; persisted via `POST /api/recipes`.
- **Negative path**: Submit with empty title / invalid quantity → inline validation errors, no navigation, nothing persisted.

### Journey: Recipe detail
- **Steps**: From `/recipes`, click a recipe → `/recipes/:id`.
- **Expected outcomes**: All ingredients render (with quantity/unit) and all steps render in `position` order.
- **Negative path**: Deep-link to `/recipes/<unknown-id>` → not-found / error state (no crash).

### Journey: Edit recipe
- **Steps**: `/recipes/:id` → "Edit" → `/recipes/:id/edit`; change title, add/remove an ingredient row, reorder/edit a step; save.
- **Expected outcomes**: Changes persist via `PUT /api/recipes/:id`; detail reflects new ingredients/steps in order; removed rows gone.
- **Negative path**: Invalid edit (blank title) → validation error, no save.

### Journey: Delete recipe
- **Steps**: From detail or list, delete a recipe; confirm.
- **Expected outcomes**: Recipe disappears from `/recipes`; a subsequent deep-link to its id → not-found.
- **Negative path**: (If confirm dialog) cancelling leaves the recipe intact.

### Journey: Weekly plan assignment
- **Steps**: `/plan` shows a 7-day × 3-slot grid for the current Monday `weekStart`; click the empty Wednesday/DINNER slot → modal opens (URL `/plan?modal=assign&day=2&slot=DINNER`) → pick "Lemon Pasta" → confirm.
- **Expected outcomes**: The slot shows "Lemon Pasta"; reloading `/plan` still shows it (persisted, verifiable via `GET /api/plan?weekStart=`). Re-assigning the same slot replaces the recipe (no duplicate).
- **Negative path**: Closing the modal without picking leaves the slot empty; clearing a slot removes the entry.

### Journey: Shopping list aggregation
- **Steps**: Plan 3 meals for the week whose recipes share some ingredients → open `/shopping-list`.
- **Expected outcomes**: Each merged item appears once, quantities summed for shared normalized name+unit, list sorted alphabetically by name. Check "lemons" → row shows struck-through; reload → still checked (persisted via `PUT /api/shopping-list/check`).
- **Negative path**: Empty plan → empty-state message. Two ingredients with the same name but different units appear as separate rows (not merged).

### Journey: Admin users page
- **Steps**: Log in as ADMIN → open `/admin/users`.
- **Expected outcomes**: Table lists all users with email, role, createdAt (data from `GET /api/users`); no passwords shown.
- **Negative path**: USER deep-linking to `/admin/users` is blocked (RequireAdmin redirect / forbidden).

### Journey: Admin settings + SPA deep links
- **Steps**: As ADMIN open `/admin/settings`; view `postgresql` and `minio` with configured/unconfigured badges; submit a credential value in a service form. Separately, deep-link (full page load) to `/recipes/:id` and other guarded routes.
- **Expected outcomes**: Settings show masked values; saving PATCHes `/api/admin/settings` and flips the badge to configured. Deep links resolve via the server's SPA static fallback to `index.html` (no 404 from the static host) and then honor auth guards.
- **Negative path**: USER deep-linking to `/admin/settings` is blocked. Navigating to an unknown path (e.g. `/nope`) renders the `NotFound` page.

---

## Data integrity tests
- **User uniqueness**: `email` is unique; duplicate signup rejected, no second row created. `passwordHash` is bcrypt (never plaintext), never returned by any endpoint.
- **First-user role**: Exactly the first-ever created user is ADMIN; all subsequent signups are USER. Seed remains idempotent (upsert-by-email) — restarting the app does not create duplicate seeded users.
- **Recipe ownership**: Every `Recipe` row's `userId` equals its creator; queries/mutations never cross user boundaries.
- **Nested relations**: Creating/updating a recipe writes `Ingredient`/`Step` rows with contiguous `position` ordering; deleting a recipe cascades to its ingredients and steps (no orphans). Create/update is transactional — a failed nested write leaves no partial recipe.
- **Plan uniqueness**: At most one `PlanEntry` per `(userId, weekStart, dayIndex, slot)`; upsert replaces rather than duplicates. `dayIndex` ∈ 0–6, `slot` ∈ {BREAKFAST, LUNCH, DINNER}.
- **Shopping check uniqueness**: At most one `ShoppingCheck` per `(userId, weekStart, itemKey)`; toggling updates in place. Check state survives shopping-list regeneration.
- **Shopping merge invariant**: For a given week, each `itemKey = lower(name)+"|"+lower(unit)` appears once with quantity = sum of contributing ingredient quantities; distinct units are never merged.
- **SystemSetting**: `key` is the primary key; PATCH upserts (one row per key); `updatedAt` advances on change.

---

## Out of scope
- **Week navigation**: Only the current Monday-anchored week is planned/tested; past/future week browsing is explicitly out of scope per the spec.
- **Unit normalization**: Free-text units are merged only on exact (normalized case/trim) match; "tbsp" vs "tablespoon" intentionally do not combine — not asserted as a defect (spec-confirmed).
- **Real backing-service connectivity**: Whether the app actually connects to provisioned postgresql/minio (vs. SQLite remaining the runtime DB) is an open question in `tasks.md`; tests cover the admin settings CRUD surface only, not live connections to those services.
- **Token expiry/refresh semantics**: JWT rotation/refresh flows are not described in the spec; only presence/absence/validity of a token is tested.
- **Rate limiting, pagination, and concurrency**: The spec is silent on these; not under test.
- **Cross-browser / responsive layout and visual styling**: Not specified; only functional assertions are covered.
- **Docker build/deploy execution**: Verifying the image builds and Colossus deploys it is a deploy-pipeline concern; only the runtime behavior it enables (SPA fallback, health endpoints) is asserted here.
