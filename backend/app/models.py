# budget: 400 lines
"""SQLAlchemy 2.x domain model for the RecipeBox meal-planner.

This file IS the schema for the fastapi-react stack (see colossus.stack.json →
components.orm.schema_file_candidates). It is the SQLAlchemy analogue of a
Prisma schema; tables are applied to the live database via `python -m app.init_db`
(the `prisma migrate deploy` equivalent for this stack).

Entities: User, Recipe, Ingredient, Step, PlanEntry, ShoppingCheck, SystemSetting.
"""
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    # Auth model = full_auth: roles are "ADMIN" | "USER"; new signups default to USER.
    role: Mapped[str] = mapped_column(String(32), default="USER")
    name: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    recipes: Mapped[list["Recipe"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    plan_entries: Mapped[list["PlanEntry"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    shopping_checks: Mapped[list["ShoppingCheck"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255), index=True)
    servings: Mapped[int] = mapped_column(Integer, default=1)
    # Tags stored as a JSON string array on the recipe (per plan).
    tags: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="recipes")
    ingredients: Mapped[list["Ingredient"]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="Ingredient.position",
    )
    steps: Mapped[list["Step"]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="Step.position",
    )
    plan_entries: Mapped[list["PlanEntry"]] = relationship(
        back_populates="recipe", cascade="all, delete-orphan"
    )


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[float] = mapped_column(Float, default=0)
    unit: Mapped[str] = mapped_column(String(64), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)

    recipe: Mapped["Recipe"] = relationship(back_populates="ingredients")


class Step(Base):
    __tablename__ = "steps"

    id: Mapped[int] = mapped_column(primary_key=True)
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer, default=0)
    text: Mapped[str] = mapped_column(Text, default="")

    recipe: Mapped["Recipe"] = relationship(back_populates="steps")


class PlanEntry(Base):
    __tablename__ = "plan_entries"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "week_start", "day_index", "slot", name="uq_plan_slot"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # Monday-anchored ISO date string (YYYY-MM-DD) for the planned week.
    week_start: Mapped[str] = mapped_column(String(10), index=True)
    day_index: Mapped[int] = mapped_column(Integer)  # 0-6, Monday..Sunday
    slot: Mapped[str] = mapped_column(String(16))  # BREAKFAST | LUNCH | DINNER
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), index=True
    )

    user: Mapped["User"] = relationship(back_populates="plan_entries")
    recipe: Mapped["Recipe"] = relationship(back_populates="plan_entries")


class ShoppingCheck(Base):
    __tablename__ = "shopping_checks"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "week_start", "item_key", name="uq_shopping_check"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    week_start: Mapped[str] = mapped_column(String(10), index=True)
    # Normalized merge key: f"{lower(name)}|{lower(unit)}".
    item_key: Mapped[str] = mapped_column(String(255))
    checked: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship(back_populates="shopping_checks")


class SystemSetting(Base):
    """Runtime override layer for service credentials (postgresql, minio).
    A config helper reads env vars first, falling back to this table."""

    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
