import { useEffect, useState } from 'react';
import type { Recipe } from '../lib/types';
import { listRecipes } from '../lib/mockStore';
import { SLOT_LABEL, DAYS, type Slot } from '../lib/week';

interface Props {
  day: number;
  slot: Slot;
  onPick: (recipeId: string) => void;
  onClose: () => void;
}

export default function AssignMealModal({ day, slot, onPick, onClose }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    listRecipes(q).then((r) => { if (alive) { setRecipes(r); setLoading(false); } });
    return () => { alive = false; };
  }, [q]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Assign meal"
      onClick={onClose} data-testid="assign-modal">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="grow">
            <h2 style={{ margin: 0 }}>Assign a recipe</h2>
            <p className="helper" style={{ margin: 0 }}>{DAYS[day]} · {SLOT_LABEL[slot]}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div className="searchbar" style={{ marginBottom: 12 }}>
            <span className="ico" aria-hidden>🔍</span>
            <input type="search" placeholder="Search recipes…" value={q}
              onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          {loading && <div className="state"><div className="spinner" /></div>}
          {!loading && recipes.length === 0 && (
            <div className="state"><span className="emoji">🍽️</span><p>No recipes to assign.</p></div>
          )}
          {!loading && recipes.map((r) => (
            <button key={r.id} className="picker-item" data-testid="picker-item"
              onClick={() => onPick(r.id)}>
              <span>
                <strong>{r.title}</strong>
                <span className="helper" style={{ display: 'block' }}>
                  {r.servings} servings · {r.ingredients.length} ingredients
                </span>
              </span>
              <span aria-hidden>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
