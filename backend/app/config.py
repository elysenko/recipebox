"""Backing-service config resolution for the admin settings panel.

Resolution priority for every key:
  1. Environment variable (mounted from app-secrets at deploy time)
  2. SystemSetting DB row (set via the admin settings panel)
  3. "" — unconfigured

SERVICE_DEFS mirrors web/src/lib/mockStore.ts SERVICE_DEFS so the settings page
renders identically once wired to the real API.
"""
import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import SystemSetting

SERVICE_DEFS: list[dict] = [
    {
        "service": "postgresql",
        "label": "PostgreSQL",
        "fields": [
            {"key": "POSTGRES_URL", "label": "Connection URL", "secret": True},
            {"key": "POSTGRES_DB", "label": "Database name", "secret": False},
        ],
    },
    {
        "service": "minio",
        "label": "MinIO (Object storage)",
        "fields": [
            {"key": "MINIO_ENDPOINT", "label": "Endpoint", "secret": False},
            {"key": "MINIO_ACCESS_KEY", "label": "Access key", "secret": False},
            {"key": "MINIO_SECRET_KEY", "label": "Secret key", "secret": True},
            {"key": "MINIO_BUCKET", "label": "Bucket", "secret": False},
        ],
    },
]

# Fallback env var names for keys whose canonical infra name differs from the
# panel key (the platform injects DATABASE_URL / POSTGRES_DB, MINIO_ROOT_*).
_ENV_ALIASES: dict[str, list[str]] = {
    "POSTGRES_URL": ["POSTGRES_URL", "DATABASE_URL"],
    "POSTGRES_DB": ["POSTGRES_DB", "PGDATABASE", "DATABASE_NAME"],
    "MINIO_ENDPOINT": ["MINIO_ENDPOINT"],
    "MINIO_ACCESS_KEY": ["MINIO_ACCESS_KEY", "MINIO_ROOT_USER"],
    "MINIO_SECRET_KEY": ["MINIO_SECRET_KEY", "MINIO_ROOT_PASSWORD"],
    "MINIO_BUCKET": ["MINIO_BUCKET"],
}


def _env_value(key: str) -> str:
    for name in _ENV_ALIASES.get(key, [key]):
        val = os.environ.get(name)
        if val:
            return val
    return ""


def resolve_config(db: Session, key: str) -> str:
    """Effective value for a config key: env first, then DB, then ''."""
    env_val = _env_value(key)
    if env_val:
        return env_val
    row = db.get(SystemSetting, key)
    if row is not None and row.value:
        return row.value
    return ""


def _mask(value: str, secret: bool) -> str:
    if not value:
        return ""
    if not secret:
        return value
    return "••••" if len(value) <= 4 else "•" * (len(value) - 4) + value[-4:]


def build_settings_view(db: Session) -> list[dict]:
    """ServiceSetting[] matching web/src/lib/types.ts."""
    out: list[dict] = []
    for defn in SERVICE_DEFS:
        fields = []
        for f in defn["fields"]:
            raw = resolve_config(db, f["key"])
            fields.append(
                {
                    "key": f["key"],
                    "label": f["label"],
                    "value": _mask(raw, f["secret"]),
                    "secret": f["secret"],
                    "configured": bool(raw),
                }
            )
        out.append(
            {
                "service": defn["service"],
                "label": defn["label"],
                "fields": fields,
                "configured": all(fld["configured"] for fld in fields),
            }
        )
    return out


def save_settings(db: Session, values: dict[str, str]) -> None:
    for key, value in values.items():
        if value is None or not value.strip():
            continue
        row = db.get(SystemSetting, key)
        if row is None:
            db.add(SystemSetting(key=key, value=value.strip()))
        else:
            row.value = value.strip()
    db.commit()
