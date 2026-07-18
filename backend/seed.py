"""Demo seed. PLATFORM CONTRACT: print one `SEED_CRED <ROLE> <email> <password>` line per
demo account AND a single `SEED_CREDS_JSON [...]` line — the deploy parses stdout into
the deployment's demo credentials. Idempotent (upsert by email)."""
import json

from sqlalchemy import select

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import User

DEMO_USERS = [
    {"role": "ADMIN", "email": "admin@example.com", "password": "Admin123!", "name": "Demo Admin"},
    {"role": "USER", "email": "user@example.com", "password": "User123!", "name": "Demo User"},
]


def main() -> None:
    Base.metadata.create_all(bind=engine)
    creds = []
    with SessionLocal() as db:
        for u in DEMO_USERS:
            existing = db.execute(select(User).where(User.email == u["email"])).scalar_one_or_none()
            if existing is None:
                db.add(User(email=u["email"], password_hash=hash_password(u["password"]), role=u["role"], name=u["name"]))
            print(f"SEED_CRED {u['role']} {u['email']} {u['password']}")
            creds.append({"role": u["role"], "email": u["email"], "password": u["password"]})
        db.commit()
    print(f"SEED_CREDS_JSON {json.dumps(creds)}")


if __name__ == "__main__":
    main()
