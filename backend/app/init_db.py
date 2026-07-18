"""Create tables at container boot (Dockerfile CMD) — the sqlalchemy analogue of
`prisma migrate deploy` in the JS stacks. Idempotent: create_all skips existing."""
from .database import Base, engine
from . import models  # noqa: F401 — register mappings

if __name__ == "__main__" or True:
    Base.metadata.create_all(bind=engine)
    print("init_db: tables ensured")
