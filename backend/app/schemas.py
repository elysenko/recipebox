"""Pydantic request models + serialization helpers.

The React client (web/src/lib/types.ts + mockStore.ts) is the authoritative API
contract. Every entity id is serialized as a STRING to match the frontend's
`id: string` types (a numeric-string like "1" round-trips through <option value>
and JWT `sub` cleanly). Response bodies are built as plain dicts for full control
over shape and id coercion; request bodies use BaseModel for validation.
"""
from datetime import datetime

from pydantic import BaseModel, Field

from .models import Ingredient, PlanEntry, Recipe, Step, User


# --------------------------------------------------------------------------- #
# Request bodies
# --------------------------------------------------------------------------- #
class SignupBody(BaseModel):
    email: str
    password: str
    name: str | None = None


class LoginBody(BaseModel):
    email: str
    password: str


class IngredientInput(BaseModel):
    name: str
    quantity: float = 0
    unit: str = ""


class StepInput(BaseModel):
    text: str


class RecipeInput(BaseModel):
    title: str
    servings: int = 1
    tags: list[str] = Field(default_factory=list)
    ingredients: list[IngredientInput] = Field(default_factory=list)
    steps: list[StepInput] = Field(default_factory=list)


class PlanEntryInput(BaseModel):
    weekStart: str
    dayIndex: int
    slot: str
    recipeId: str


class ShoppingCheckInput(BaseModel):
    weekStart: str
    itemKey: str
    checked: bool


# --------------------------------------------------------------------------- #
# Serialization helpers (return plain dicts with string ids)
# --------------------------------------------------------------------------- #
def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt is not None else None


def serialize_user(u: User) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "role": u.role,
        "name": u.name,
        "createdAt": _iso(u.created_at),
    }


def serialize_ingredient(i: Ingredient) -> dict:
    return {
        "id": str(i.id),
        "name": i.name,
        "quantity": i.quantity,
        "unit": i.unit,
        "position": i.position,
    }


def serialize_step(s: Step) -> dict:
    return {"id": str(s.id), "position": s.position, "text": s.text}


def serialize_recipe(r: Recipe) -> dict:
    return {
        "id": str(r.id),
        "userId": str(r.user_id),
        "title": r.title,
        "servings": r.servings,
        "tags": list(r.tags or []),
        "ingredients": [serialize_ingredient(i) for i in sorted(r.ingredients, key=lambda x: x.position)],
        "steps": [serialize_step(s) for s in sorted(r.steps, key=lambda x: x.position)],
        "createdAt": _iso(r.created_at),
    }


def serialize_plan_entry(p: PlanEntry) -> dict:
    return {
        "id": str(p.id),
        "weekStart": p.week_start,
        "dayIndex": p.day_index,
        "slot": p.slot,
        "recipeId": str(p.recipe_id),
        "recipeTitle": p.recipe.title if p.recipe is not None else "Unknown recipe",
    }
