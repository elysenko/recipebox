export interface IngredientDraft {
  name: string;
  quantity: string;
  unit: string;
}

interface Props {
  value: IngredientDraft;
  index: number;
  onChange: (v: IngredientDraft) => void;
  onRemove: () => void;
}

export default function IngredientRow({ value, index, onChange, onRemove }: Props) {
  return (
    <div className="row-edit row-ingredient" data-testid="ingredient-row">
      <input
        aria-label={`Ingredient ${index + 1} name`}
        placeholder="Ingredient"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
      />
      <input
        aria-label={`Ingredient ${index + 1} quantity`}
        placeholder="Qty"
        inputMode="decimal"
        value={value.quantity}
        onChange={(e) => onChange({ ...value, quantity: e.target.value })}
      />
      <input
        aria-label={`Ingredient ${index + 1} unit`}
        placeholder="Unit"
        value={value.unit}
        onChange={(e) => onChange({ ...value, unit: e.target.value })}
      />
      <button type="button" className="icon-btn" onClick={onRemove} aria-label="Remove ingredient">✕</button>
    </div>
  );
}
