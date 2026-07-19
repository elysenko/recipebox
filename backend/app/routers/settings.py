"""Admin settings panel: view/patch backing-service credentials (ADMIN only).

Values resolve env-first, DB-fallback (see app/config.py). Secrets are returned
masked. PATCH accepts a flat { key: value } JSON object of overrides to persist.
"""
from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..config import build_settings_view, save_settings
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/api/admin/settings", tags=["settings"])


@router.get("")
def get_settings(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[dict]:
    return build_settings_view(db)


@router.patch("")
def patch_settings(
    values: dict[str, str] = Body(...),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict:
    save_settings(db, values)
    return {"ok": True}
