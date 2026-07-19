"""Auth routes: signup, login, me. full_auth model — first-ever user becomes ADMIN."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import get_current_user, hash_password, sign_token, verify_password
from ..database import get_db
from ..models import User
from ..schemas import LoginBody, SignupBody, serialize_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup")
def signup(body: SignupBody, db: Session = Depends(get_db)) -> dict:
    email = body.email.strip().lower()
    if not email or not body.password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="An account with that email already exists")
    # First-ever user is promoted to ADMIN (full_auth bootstrap).
    count = db.execute(select(func.count()).select_from(User)).scalar_one()
    role = "ADMIN" if count == 0 else "USER"
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        role=role,
        name=(body.name or "").strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": sign_token(user), "user": serialize_user(user)}


@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_db)) -> dict:
    email = body.email.strip().lower()
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": sign_token(user), "user": serialize_user(user)}


@router.get("/me")
def me(user: User = Depends(get_current_user)) -> dict:
    return serialize_user(user)
