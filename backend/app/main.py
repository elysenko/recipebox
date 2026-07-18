"""FastAPI app entry. Serve contract: uvicorn on PORT=3000 behind the nginx /api proxy
(web/nginx.conf strips nothing — all routes here are mounted under /api). Keep
GET /api/health intact: the platform's backend reachability probe depends on it."""
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import get_current_user, sign_token, verify_password
from .database import get_db
from .models import User

app = FastAPI(title="app-backend", docs_url="/api/docs", openapi_url="/api/openapi.json")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


class LoginBody(BaseModel):
    email: str
    password: str


@app.post("/api/auth/login")
def login(body: LoginBody, db: Session = Depends(get_db)) -> dict:
    user = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": sign_token(user), "user": {"id": user.id, "email": user.email, "role": user.role, "name": user.name}}


@app.get("/api/auth/me")
def me(user: User = Depends(get_current_user)) -> dict:
    return {"id": user.id, "email": user.email, "role": user.role, "name": user.name}
