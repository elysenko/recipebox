# syntax=docker/dockerfile:1
# Combined nginx + FastAPI container (supervisord managed) — mandated for full-stack
# apps: nginx serves the compiled React SPA and proxies /api/ to the local uvicorn.

# ── Stage 1: build the React (Vite) frontend ─────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --loglevel=error
COPY web/ ./
# BASE_HREF=/ (single-preview: SPA is served at subdomain root)
RUN npx vite build --base=/

# ── Stage 2: install backend Python deps into an isolated venv ───────────────
FROM python:3.12-slim AS backend-builder
WORKDIR /app/backend
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
COPY backend/requirements.txt ./
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# ── Stage 3: runtime combining nginx + FastAPI + supervisord ─────────────────
FROM python:3.12-slim AS runtime

# nginx (SPA server + /api reverse proxy) and supervisor (PID 1 process manager)
RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx supervisor curl && \
    rm -rf /var/lib/apt/lists/*

# Python venv from backend-builder
COPY --from=backend-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" PYTHONUNBUFFERED=1

# Backend source
WORKDIR /app/backend
COPY backend/ /app/backend/

# Built frontend assets → nginx docroot
COPY --from=frontend-builder /app/web/dist /usr/share/nginx/html

# nginx site config — replaces default and configures /api + /trpc reverse proxy
COPY nginx.conf /etc/nginx/sites-available/default
RUN rm -f /etc/nginx/sites-enabled/default && \
    ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# supervisord config: runs uvicorn (:3000) + nginx (:80) as foreground children
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
