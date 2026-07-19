"""Aggregated shopping list for a planned week.

Ingredients across all planned recipes merge by itemKey = lower(name)|lower(unit);
matching entries sum quantities, differing units stay separate. Check-off state is
persisted per (user, weekStart, itemKey) so it survives reloads and regeneration.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import PlanEntry, Recipe, ShoppingCheck, User
from ..schemas import ShoppingCheckInput

router = APIRouter(prefix="/api/shopping-list", tags=["shopping"])


@router.get("")
def get_shopping_list(
    weekStart: str = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    entries = (
        db.execute(
            select(PlanEntry).where(
                PlanEntry.user_id == user.id, PlanEntry.week_start == weekStart
            )
        )
        .scalars()
        .all()
    )
    checks = {
        c.item_key: c.checked
        for c in db.execute(
            select(ShoppingCheck).where(
                ShoppingCheck.user_id == user.id, ShoppingCheck.week_start == weekStart
            )
        ).scalars()
    }

    merged: dict[str, dict] = {}
    for entry in entries:
        recipe = db.get(Recipe, entry.recipe_id)
        if recipe is None:
            continue
        for ing in recipe.ingredients:
            item_key = f"{ing.name.strip().lower()}|{ing.unit.strip().lower()}"
            if item_key in merged:
                merged[item_key]["quantity"] += ing.quantity
            else:
                merged[item_key] = {
                    "itemKey": item_key,
                    "name": ing.name,
                    "unit": ing.unit,
                    "quantity": ing.quantity,
                    "checked": checks.get(item_key, False),
                }
    return sorted(merged.values(), key=lambda x: x["name"].lower())


@router.put("/check")
def check_item(
    body: ShoppingCheckInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    row = db.execute(
        select(ShoppingCheck).where(
            ShoppingCheck.user_id == user.id,
            ShoppingCheck.week_start == body.weekStart,
            ShoppingCheck.item_key == body.itemKey,
        )
    ).scalar_one_or_none()
    if row is None:
        row = ShoppingCheck(
            user_id=user.id,
            week_start=body.weekStart,
            item_key=body.itemKey,
            checked=body.checked,
        )
        db.add(row)
    else:
        row.checked = body.checked
    db.commit()
    return {"ok": True}
