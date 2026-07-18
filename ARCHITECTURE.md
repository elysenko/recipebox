# Architecture

## Stack
Requested stack: `fastapi-react` (platform-fixed — see `<stack_contract>`; this is the
project's locked stack regardless of what any technical plan proposes).

- **web/** — React 18 + Vite + TypeScript SPA, React Router. Newly scaffolded from
  `template-fastapi-react/web`.
- **backend/** — FastAPI (Python) + SQLAlchemy, JWT auth (`passlib`/`bcrypt`, `pyjwt`).
  Newly scaffolded from `template-fastapi-react/backend`. Serves on port 3000 behind
  an nginx `/api` proxy in the deployed image; `GET /api/health` is the platform's
  backend reachability probe — do not remove it.

Both platforms were absent before this run (project contained only `README.md` and
`.github/`), so this is a **greenfield** scaffold — see `ATLAS_STACK.md`.

## Layout
```
web/       Vite React SPA (dev proxy → backend /api)
backend/   FastAPI app (app/main.py, app/models.py, app/auth.py, app/database.py)
```

## Template sources
- `template_dir/template-fastapi-react/web` → `web/`
- `template_dir/template-fastapi-react/backend` → `backend/`

## Build/deploy manifest
`colossus.yaml` declares the build contract for deploy agents: React SPA built to
`web/dist`, served by nginx with SPA fallback on port 80; FastAPI backend built from
`backend/Dockerfile` on port 3000.

`.colossus-acceptance.json` is the render-gate contract. `ready_testid: "app-ready"`
marks the shell root in `web/src/App.tsx` — never remove that `data-testid`. The
`reject_signatures` currently list the untouched template stub's markers ("Welcome"
title, health-check placeholder text); the coder must update `expect_text` with real
front-page content once features are built.

## Next steps for the developer / coder agent
1. Note the plan (meal-planner, NestJS/Prisma/JWT) describes a **different** tech
   stack than what's scaffolded here. Per the stack contract, implement the plan's
   **features** (recipes, weekly planning, shopping list, auth) on top of the
   **fastapi-react** stack that's actually present — do not attempt to introduce
   NestJS, Prisma, or a Node backend.
2. `backend/requirements.txt` already includes `psycopg2-binary` — decide whether to
   use Postgres (`site_namespace` provides one) or keep this simpler with SQLite by
   adjusting `app/database.py`; no `.env.template` ships with this template, so add
   any required env vars (e.g. `DATABASE_URL`, `JWT_SECRET`) directly where the app
   reads them and document them in the README.
3. Flesh out `backend/app/models.py` with the domain models (recipes, ingredients,
   steps, plan entries, shopping checks) and add routers beyond the auth/health stubs.
4. Build out `web/src/pages/` beyond the current `Home`/`Login` stubs to cover all
   deep-linkable routes from the plan (`/recipes`, `/recipes/new`, `/recipes/:id`,
   `/plan`, `/shopping-list`, `/admin/users`, etc.).
5. Run `cd web && npm install` and `cd backend && pip install -r requirements.txt`
   locally to develop; the deploy image builds both via their respective Dockerfiles.
6. Keep every new source file under the 400-line budget (`// budget: 400 lines` /
   `# budget: 400 lines` header) per the file-budget constraint.
