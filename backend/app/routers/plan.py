"""Weekly meal plan: 7 days x 3 slots, upserted per (user, weekStart, day, slot)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import PlanEntry, Recipe, User
from ..schemas import PlanEntryInput, serialize_plan_entry

router = APIRouter(prefix="/api/plan", tags=["plan"])

VALID_SLOTS = {"BREAKFAST", "LUNCH", "DINNER"}


@router.get("")
def get_plan(
    weekStart: str = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    entries = (
        db.execute(
            select(PlanEntry)
            .where(PlanEntry.user_id == user.id, PlanEntry.week_start == weekStart)
            .order_by(PlanEntry.day_index.asc())
        )
        .scalars()
        .all()
    )
    return [serialize_plan_entry(e) for e in entries]


@router.put("/entry")
def put_plan_entry(
    body: PlanEntryInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if body.slot not in VALID_SLOTS:
        raise HTTPException(status_code=400, detail="Invalid slot")
    if not 0 <= body.dayIndex <= 6:
        raise HTTPException(status_code=400, detail="dayIndex must be 0-6")
    try:
        recipe_id = int(body.recipeId)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid recipeId") from exc
    recipe = db.get(Recipe, recipe_id)
    if recipe is None or recipe.user_id != user.id:
        raise HTTPException(status_code=404, detail="Recipe not found")

    entry = db.execute(
        select(PlanEntry).where(
            PlanEntry.user_id == user.id,
            PlanEntry.week_start == body.weekStart,
            PlanEntry.day_index == body.dayIndex,
            PlanEntry.slot == body.slot,
        )
    ).scalar_one_or_none()
    if entry is None:
        entry = PlanEntry(
            user_id=user.id,
            week_start=body.weekStart,
            day_index=body.dayIndex,
            slot=body.slot,
            recipe_id=recipe_id,
        )
        db.add(entry)
    else:
        entry.recipe_id = recipe_id
    db.commit()
    db.refresh(entry)
    return serialize_plan_entry(entry)


@router.delete("/entry/{entry_id}")
def delete_plan_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    entry = db.get(PlanEntry, entry_id)
    if entry is None or entry.user_id != user.id:
        raise HTTPException(status_code=404, detail="Plan entry not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}
