# recipebox

A full-stack meal planner: browse and edit recipes, plan a Monday-anchored week
of meals, and generate an aggregated shopping list. React + Vite SPA frontend
(`web/`) and a FastAPI + SQLAlchemy backend (`backend/`) with JWT auth.

## Requirements

- Python 3.11+
- Node.js 18+
- A PostgreSQL database (the platform injects one at deploy time)

## Environment variables

| Variable       | Required | Description                                                        |
| -------------- | -------- | ------------------------------------------------------------------ |
| `JWT_SECRET`   | yes      | Secret used to sign/verify JWTs. The API refuses to boot if unset. |
| `DATABASE_URL` | yes      | SQLAlchemy Postgres URL, e.g. `postgresql://postgres:postgres@localhost:5432/app`. |
| `PORT`         | no       | Port the API/uvicorn listens on (defaults to `3000`).              |

## Run locally

### Backend (`backend/`)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# required env
export JWT_SECRET="dev-secret"
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app"
export PORT=3000

# create tables + load demo data (idempotent)
python seed.py

# start the API
uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
```

### Frontend (`web/`)

```bash
cd web
npm install
npm run dev      # Vite dev server, proxies /api to the backend
npm run build    # type-check + production build into web/dist
```

## Demo credentials

Seeded by `backend/seed.py` (password is the same for both accounts):

| Role  | Email                   | Password      |
| ----- | ----------------------- | ------------- |
| ADMIN | `admin@recipebox.test`  | `password123` |
| USER  | `cook@recipebox.test`   | `password123` |
