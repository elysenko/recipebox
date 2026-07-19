"""Demo seed. PLATFORM CONTRACT: print one `SEED_CRED <ROLE> <email> <password>` line per
demo account AND a single `SEED_CREDS_JSON [...]` line — the deploy parses stdout into
the deployment's demo credentials. Idempotent (upsert by email)."""
import json

from sqlalchemy import select

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import Ingredient, Recipe, Step, User

DEMO_USERS = [
    {"role": "ADMIN", "email": "admin@recipebox.test", "password": "password123", "name": "Demo Admin"},
    {"role": "USER", "email": "cook@recipebox.test", "password": "password123", "name": "Demo Cook"},
]

SAMPLE_RECIPE = {
    "title": "Lemon Pasta",
    "servings": 4,
    "tags": ["pasta", "vegetarian", "quick"],
    "ingredients": [
        {"name": "Spaghetti", "quantity": 400, "unit": "g"},
        {"name": "Lemons", "quantity": 2, "unit": "whole"},
        {"name": "Parmesan", "quantity": 60, "unit": "g"},
        {"name": "Olive oil", "quantity": 3, "unit": "tbsp"},
        {"name": "Garlic", "quantity": 2, "unit": "clove"},
    ],
    "steps": [
        "Bring a large pot of salted water to a boil and cook the spaghetti until al dente.",
        "Meanwhile, zest and juice the lemons; grate the parmesan.",
        "Gently warm olive oil with sliced garlic, then stir in lemon juice and zest.",
        "Toss drained pasta with the sauce and parmesan; season and serve.",
    ],
}


def main() -> None:
    Base.metadata.create_all(bind=engine)
    creds = []
    with SessionLocal() as db:
        cook: User | None = None
        for u in DEMO_USERS:
            existing = db.execute(select(User).where(User.email == u["email"])).scalar_one_or_none()
            if existing is None:
                existing = User(
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"],
                    name=u["name"],
                )
                db.add(existing)
                db.flush()
            if u["role"] == "USER":
                cook = existing
            print(f"SEED_CRED {u['role']} {u['email']} {u['password']}")
            creds.append({"role": u["role"], "email": u["email"], "password": u["password"]})

        # Sample recipe for the demo cook (idempotent by title + owner).
        if cook is not None:
            has_recipe = db.execute(
                select(Recipe).where(
                    Recipe.user_id == cook.id, Recipe.title == SAMPLE_RECIPE["title"]
                )
            ).scalar_one_or_none()
            if has_recipe is None:
                recipe = Recipe(
                    user_id=cook.id,
                    title=SAMPLE_RECIPE["title"],
                    servings=SAMPLE_RECIPE["servings"],
                    tags=list(SAMPLE_RECIPE["tags"]),
                    ingredients=[
                        Ingredient(position=i, **ing)
                        for i, ing in enumerate(SAMPLE_RECIPE["ingredients"])
                    ],
                    steps=[
                        Step(position=i, text=text)
                        for i, text in enumerate(SAMPLE_RECIPE["steps"])
                    ],
                )
                db.add(recipe)

        db.commit()
    print(f"SEED_CREDS_JSON {json.dumps(creds)}")


if __name__ == "__main__":
    main()
