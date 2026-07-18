import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Recipe } from '../lib/types';
import { deleteRecipe, getRecipe } from '../lib/mockStore';

function fmtQty(q: number, unit: string) {
  const n = Number.isInteger(q) ? q : Math.round(q * 100) / 100;
  return `${n}${unit ? ` ${unit}` : ''}`;
}

export default function RecipeDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    getRecipe(id)
      .then((r) => { if (alive) { setRecipe(r); setStatus('ok'); } })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [id]);

  async function onDelete() {
    if (!recipe) return;
    if (!window.confirm(`Delete “${recipe.title}”? This cannot be undone.`)) return;
    await deleteRecipe(recipe.id);
    navigate('/recipes');
  }

  if (status === 'loading') return <div className="state" data-testid="detail-loading"><div className="spinner" /></div>;
  if (status === 'error' || !recipe)
    return (
      <div className="card state" data-testid="detail-error">
        <span className="emoji">🤷</span>
        <h2>Recipe not found</h2>
        <Link to="/recipes" className="btn btn-outline" style={{ marginTop: 12 }}>Back to recipes</Link>
      </div>
    );

  return (
    <article data-testid="recipe-detail">
      <p><Link to="/recipes" className="helper">← All recipes</Link></p>
      <div className="card">
        <div className="detail-hero">
          <div className="page-head" style={{ marginBottom: 0 }}>
            <div className="grow">
              <h1 data-testid="detail-title">{recipe.title}</h1>
              <div className="meta-row" style={{ fontSize: '.9rem' }}>
                <span>🍽️ {recipe.servings} servings</span>
                <span>🧂 {recipe.ingredients.length} ingredients</span>
                <span>📋 {recipe.steps.length} steps</span>
              </div>
            </div>
            <div className="chips" style={{ alignItems: 'center' }}>
              <Link to={`/recipes/${recipe.id}/edit`} className="btn btn-outline btn-sm" data-testid="edit-recipe-btn">Edit</Link>
              <button className="btn btn-danger btn-sm" onClick={onDelete} data-testid="delete-recipe-btn">Delete</button>
            </div>
          </div>
          <div className="tags">
            {recipe.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
          </div>
        </div>

        <section className="section">
          <h2>Ingredients</h2>
          <ul className="ingredient-list" data-testid="ingredient-list">
            {recipe.ingredients.map((ing) => (
              <li key={ing.id}>
                <span className="name">{ing.name}</span>
                <span className="qty">{fmtQty(ing.quantity, ing.unit)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="section">
          <h2>Steps</h2>
          <ol className="step-list" data-testid="step-list">
            {recipe.steps.map((s, i) => (
              <li key={s.id}>
                <span className="step-num" aria-hidden>{i + 1}</span>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}
