"""Admin users list (ADMIN only)."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..database import get_db
from ..models import User
from ..schemas import serialize_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("")
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[dict]:
    users = db.execute(select(User).order_by(User.created_at.asc())).scalars().all()
    return [serialize_user(u) for u in users]
