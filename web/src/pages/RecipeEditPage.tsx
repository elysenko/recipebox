import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Recipe } from '../lib/types';
import { createRecipe, getRecipe, updateRecipe, type RecipeInput } from '../lib/mockStore';
import RecipeForm from '../components/RecipeForm';

export default function RecipeEditPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [initial, setInitial] = useState<Recipe | undefined>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(isEdit ? 'loading' : 'ready');

  useEffect(() => {
    if (!isEdit || !id) return;
    let alive = true;
    getRecipe(id)
      .then((r) => { if (alive) { setInitial(r); setStatus('ready'); } })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [id, isEdit]);

  async function handleSubmit(input: RecipeInput) {
    if (isEdit && id) {
      await updateRecipe(id, input);
      navigate(`/recipes/${id}`);
    } else {
      const created = await createRecipe(input);
      navigate(`/recipes/${created.id}`);
    }
  }

  if (status === 'loading') return <div className="state"><div className="spinner" /></div>;
  if (status === 'error') return <div className="error-banner">Couldn’t load this recipe.</div>;

  return (
    <div data-testid="recipe-edit-page">
      <div className="page-head">
        <div className="grow">
          <h1>{isEdit ? 'Edit recipe' : 'New recipe'}</h1>
          <p className="subtitle">{isEdit ? 'Update ingredients, steps and details.' : 'Add ingredients and ordered steps.'}</p>
        </div>
      </div>
      <RecipeForm
        initial={initial}
        submitLabel={isEdit ? 'Save changes' : 'Create recipe'}
        onSubmit={handleSubmit}
        onCancel={() => navigate(isEdit && id ? `/recipes/${id}` : '/recipes')}
      />
    </div>
  );
}
