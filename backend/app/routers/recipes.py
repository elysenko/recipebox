"""Recipe CRUD, scoped to the authenticated user. Nested ingredients + steps are
replaced wholesale on update inside a single transaction."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Ingredient, Recipe, Step, User
from ..schemas import RecipeInput, serialize_recipe

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


def _owned_recipe(db: Session, recipe_id: int, user: User) -> Recipe:
    recipe = db.get(Recipe, recipe_id)
    if recipe is None or recipe.user_id != user.id:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


def _apply_children(recipe: Recipe, data: RecipeInput) -> None:
    recipe.ingredients = [
        Ingredient(name=i.name.strip(), quantity=i.quantity, unit=i.unit.strip(), position=idx)
        for idx, i in enumerate(data.ingredients)
    ]
    recipe.steps = [
        Step(position=idx, text=s.text) for idx, s in enumerate(data.steps)
    ]


@router.get("")
def list_recipes(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    recipes = (
        db.execute(
            select(Recipe).where(Recipe.user_id == user.id).order_by(Recipe.created_at.desc())
        )
        .scalars()
        .all()
    )
    if q and q.strip():
        needle = q.strip().lower()
        recipes = [
            r
            for r in recipes
            if needle in r.title.lower()
            or any(needle in str(t).lower() for t in (r.tags or []))
        ]
    return [serialize_recipe(r) for r in recipes]


@router.post("")
def create_recipe(
    body: RecipeInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    recipe = Recipe(
        user_id=user.id,
        title=body.title.strip(),
        servings=body.servings,
        tags=list(body.tags),
    )
    _apply_children(recipe, body)
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return serialize_recipe(recipe)


@router.get("/{recipe_id}")
def get_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return serialize_recipe(_owned_recipe(db, recipe_id, user))


@router.put("/{recipe_id}")
def update_recipe(
    recipe_id: int,
    body: RecipeInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    recipe = _owned_recipe(db, recipe_id, user)
    recipe.title = body.title.strip()
    recipe.servings = body.servings
    recipe.tags = list(body.tags)
    _apply_children(recipe, body)
    db.commit()
    db.refresh(recipe)
    return serialize_recipe(recipe)


@router.delete("/{recipe_id}")
def delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    recipe = _owned_recipe(db, recipe_id, user)
    db.delete(recipe)
    db.commit()
    return {"ok": True}
