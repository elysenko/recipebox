import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Recipe } from '../lib/types';
import { listRecipes } from '../lib/mockStore';

export default function RecipeListPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    listRecipes(q)
      .then((r) => { if (alive) { setRecipes(r); setStatus('ok'); } })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [q]);

  function onSearch(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value);
    else next.delete('q');
    setParams(next, { replace: true });
  }

  return (
    <div data-testid="recipes-page">
      <div className="page-head">
        <div className="grow">
          <h1 data-testid="recipes-title">Recipes</h1>
          <p className="subtitle">Your collection of dishes to cook and plan.</p>
        </div>
        <Link to="/recipes/new" className="btn btn-primary" data-testid="new-recipe-btn">+ New recipe</Link>
      </div>

      <div className="searchbar" style={{ marginBottom: 18 }}>
        <span className="ico" aria-hidden>🔍</span>
        <input
          type="search"
          placeholder="Search by title or tag…"
          defaultValue={q}
          key={q}
          data-testid="recipe-search"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {status === 'loading' && (
        <div className="state" data-testid="recipes-loading"><div className="spinner" /></div>
      )}
      {status === 'error' && (
        <div className="error-banner" data-testid="recipes-error">Couldn’t load recipes. Please try again.</div>
      )}
      {status === 'ok' && recipes.length === 0 && (
        <div className="card state" data-testid="recipes-empty">
          <span className="emoji">🍽️</span>
          <h2>{q ? 'No matches' : 'No recipes yet'}</h2>
          <p>{q ? `Nothing matched “${q}”.` : 'Create your first recipe to get started.'}</p>
          {!q && <Link to="/recipes/new" className="btn btn-primary" style={{ marginTop: 12 }}>+ New recipe</Link>}
        </div>
      )}
      {status === 'ok' && recipes.length > 0 && (
        <div className="grid-recipes" data-testid="recipes-grid">
          {recipes.map((r) => (
            <Link to={`/recipes/${r.id}`} key={r.id} className="card recipe-card" data-testid="recipe-card">
              <div className="recipe-thumb" aria-hidden>🍲</div>
              <div className="body">
                <h3>{r.title}</h3>
                <div className="meta-row">
                  <span>🍽️ {r.servings} servings</span>
                  <span>🧂 {r.ingredients.length} ingredients</span>
                </div>
                <div className="tags">
                  {r.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
