import { useState } from 'react';
import type { Recipe } from '../lib/types';
import type { RecipeInput } from '../lib/mockStore';
import IngredientRow, { type IngredientDraft } from './IngredientRow';

interface Props {
  initial?: Recipe;
  submitLabel: string;
  onSubmit: (input: RecipeInput) => Promise<void>;
  onCancel: () => void;
}

export default function RecipeForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [servings, setServings] = useState(String(initial?.servings ?? 4));
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    initial?.ingredients.map((i) => ({ name: i.name, quantity: String(i.quantity), unit: i.unit })) ?? [
      { name: '', quantity: '', unit: '' },
    ],
  );
  const [steps, setSteps] = useState<string[]>(
    initial?.steps.map((s) => s.text) ?? [''],
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function setIngredient(i: number, v: IngredientDraft) {
    setIngredients((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  }
  function setStep(i: number, v: string) {
    setSteps((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const cleanIngredients = ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({ name: i.name.trim(), quantity: Number(i.quantity) || 0, unit: i.unit.trim() }));
    const cleanSteps = steps.filter((s) => s.trim()).map((s) => ({ text: s.trim() }));
    if (!title.trim()) return setError('Please give your recipe a title.');
    if (cleanIngredients.length === 0) return setError('Add at least one ingredient.');
    if (cleanSteps.length === 0) return setError('Add at least one step.');
    setBusy(true);
    try {
      await onSubmit({
        title: title.trim(),
        servings: Number(servings) || 1,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        ingredients: cleanIngredients,
        steps: cleanSteps,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} data-testid="recipe-form">
      {error && <div className="error-banner">{error}</div>}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" data-testid="recipe-title-input" value={title}
            onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lemon Pasta" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="servings">Servings</label>
            <input id="servings" type="number" min={1} inputMode="numeric" value={servings}
              onChange={(e) => setServings(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="tags">Tags</label>
            <input id="tags" value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="pasta, vegetarian, quick" />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h2>Ingredients</h2>
        {ingredients.map((ing, i) => (
          <IngredientRow
            key={i}
            index={i}
            value={ing}
            onChange={(v) => setIngredient(i, v)}
            onRemove={() => setIngredients((prev) => prev.filter((_, idx) => idx !== i))}
          />
        ))}
        <button type="button" className="btn btn-outline btn-sm" data-testid="add-ingredient"
          onClick={() => setIngredients((prev) => [...prev, { name: '', quantity: '', unit: '' }])}>
          + Add ingredient
        </button>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h2>Steps</h2>
        {steps.map((s, i) => (
          <div className="row-edit row-step" key={i} data-testid="step-row">
            <span className="step-num" aria-hidden>{i + 1}</span>
            <textarea aria-label={`Step ${i + 1}`} value={s} placeholder="Describe this step…"
              onChange={(e) => setStep(i, e.target.value)} />
            <button type="button" className="icon-btn" aria-label="Remove step"
              onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm" data-testid="add-step"
          onClick={() => setSteps((prev) => [...prev, ''])}>
          + Add step
        </button>
      </div>

      <div className="chips" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy} data-testid="save-recipe">
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
