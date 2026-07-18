import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ShoppingItem } from '../lib/types';
import { checkShoppingItem, getShoppingList } from '../lib/mockStore';
import { currentWeekStart, weekLabel } from '../lib/week';

function fmtQty(q: number, unit: string) {
  const n = Number.isInteger(q) ? q : Math.round(q * 100) / 100;
  return `${n}${unit ? ` ${unit}` : ''}`;
}

export default function ShoppingListPage() {
  const weekStart = currentWeekStart();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getShoppingList(weekStart).then((i) => { if (alive) { setItems(i); setLoading(false); } });
    return () => { alive = false; };
  }, [weekStart]);

  async function toggle(item: ShoppingItem) {
    const next = !item.checked;
    // optimistic update
    setItems((prev) => prev.map((x) => (x.itemKey === item.itemKey ? { ...x, checked: next } : x)));
    await checkShoppingItem(weekStart, item.itemKey, next);
  }

  const remaining = items.filter((i) => !i.checked).length;

  return (
    <div data-testid="shopping-page">
      <div className="page-head">
        <div className="grow">
          <h1>Shopping list</h1>
          <p className="subtitle">
            Auto-merged from your plan · week of {weekLabel(weekStart)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="state"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="card state" data-testid="shopping-empty">
          <span className="emoji">🛒</span>
          <h2>Nothing to buy yet</h2>
          <p>Assign meals to your week and ingredients will gather here automatically.</p>
          <Link to="/plan" className="btn btn-primary" style={{ marginTop: 12 }}>Go to meal plan</Link>
        </div>
      ) : (
        <>
          <p className="helper" style={{ marginBottom: 10 }} data-testid="shopping-summary">
            {remaining} of {items.length} items left
          </p>
          <ul className="card shop-list" data-testid="shopping-list">
            {items.map((item) => (
              <li key={item.itemKey} className={`shop-item ${item.checked ? 'checked' : ''}`} data-testid="shopping-item">
                <input
                  type="checkbox"
                  className="shop-check"
                  checked={item.checked}
                  onChange={() => toggle(item)}
                  aria-label={item.name}
                  data-testid="shopping-check"
                />
                <span className="name">{item.name}</span>
                <span className="amount">{fmtQty(item.quantity, item.unit)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
