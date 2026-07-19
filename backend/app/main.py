"""FastAPI app entry. Serve contract: uvicorn on PORT=3000 behind the nginx /api proxy
(web/nginx.conf strips nothing — all routes here are mounted under /api). Keep
GET /api/health intact: the platform's backend reachability probe depends on it.

The React SPA is served by its own nginx service (serve_topology =
nginx_spa_plus_backend_service); this process is API-only."""
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .database import get_db
from .routers import auth, plan, recipes, settings, shopping, users

app = FastAPI(title="app-backend", docs_url="/api/docs", openapi_url="/api/openapi.json")

# SPA and API share an origin in production (nginx proxies /api). CORS stays open
# so the vite dev-server and any preview host can reach the API directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/health/deep")
def health_deep(db: Session = Depends(get_db)) -> dict:
    """Deep probe: confirm the database is reachable."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception as exc:  # noqa: BLE001 — surface the DB failure to the probe
        return {"status": "error", "db": "error", "detail": str(exc)}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(recipes.router)
app.include_router(plan.router)
app.include_router(shopping.router)
app.include_router(settings.router)
