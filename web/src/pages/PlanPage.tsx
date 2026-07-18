import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PlanEntry } from '../lib/types';
import { deletePlanEntry, getPlan, putPlanEntry } from '../lib/mockStore';
import {
  SLOTS, SLOT_LABEL, DAYS, currentWeekStart, weekDates, weekLabel, toISODate, mondayOf, type Slot,
} from '../lib/week';
import AssignMealModal from '../components/AssignMealModal';

export default function PlanPage() {
  const weekStart = currentWeekStart();
  const [entries, setEntries] = useState<PlanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();

  const todayIso = toISODate(new Date());
  const dates = weekDates(weekStart);
  const isThisWeek = toISODate(mondayOf(new Date())) === weekStart;

  const reload = useCallback(() => {
    setLoading(true);
    getPlan(weekStart).then((e) => { setEntries(e); setLoading(false); });
  }, [weekStart]);

  useEffect(() => { reload(); }, [reload]);

  const modal = params.get('modal') === 'assign';
  const day = Number(params.get('day'));
  const slot = params.get('slot') as Slot | null;

  function openAssign(d: number, s: Slot) {
    const next = new URLSearchParams(params);
    next.set('modal', 'assign');
    next.set('day', String(d));
    next.set('slot', s);
    setParams(next);
  }
  function closeModal() {
    const next = new URLSearchParams(params);
    next.delete('modal'); next.delete('day'); next.delete('slot');
    setParams(next, { replace: true });
  }

  async function assign(recipeId: string) {
    if (slot == null || Number.isNaN(day)) return;
    await putPlanEntry(weekStart, day, slot, recipeId);
    closeModal();
    reload();
  }
  async function clearSlot(entry: PlanEntry) {
    await deletePlanEntry(entry.id);
    reload();
  }

  const entryFor = (d: number, s: Slot) =>
    entries.find((e) => e.dayIndex === d && e.slot === s);

  return (
    <div data-testid="plan-page">
      <div className="page-head">
        <div className="grow">
          <h1>Meal plan</h1>
          <p className="subtitle">
            Week of {weekLabel(weekStart)}{isThisWeek ? ' · this week' : ''}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="state"><div className="spinner" /></div>
      ) : (
        <div className="plan-scroll">
          <div className="plan-grid" data-testid="plan-grid">
            <div className="plan-cell-head" />
            {DAYS.map((d, i) => {
              const today = toISODate(dates[i]) === todayIso;
              return (
                <div className={`plan-day-head ${today ? 'today' : ''}`} key={d}>
                  <span className="dow">{d}</span>
                  <span className="date">{dates[i].getDate()}</span>
                </div>
              );
            })}

            {SLOTS.map((s) => (
              <FragmentRow key={s} slot={s}>
                <div className="plan-slot-label">{SLOT_LABEL[s]}</div>
                {DAYS.map((_, d) => {
                  const entry = entryFor(d, s);
                  return entry ? (
                    <div className="plan-slot filled" key={`${d}-${s}`} data-testid="plan-slot-filled">
                      <button className="clear-x" aria-label="Clear slot" onClick={() => clearSlot(entry)}>✕</button>
                      <span className="meal-title">{entry.recipeTitle}</span>
                    </div>
                  ) : (
                    <button className="plan-slot empty" key={`${d}-${s}`} data-testid="plan-slot-empty"
                      aria-label={`Assign ${SLOT_LABEL[s]} for ${DAYS[d]}`}
                      onClick={() => openAssign(d, s)}>
                      +
                    </button>
                  );
                })}
              </FragmentRow>
            ))}
          </div>
        </div>
      )}

      {modal && slot && !Number.isNaN(day) && (
        <AssignMealModal day={day} slot={slot} onPick={assign} onClose={closeModal} />
      )}
    </div>
  );
}

// Grid rows are flattened; this just renders children so the grid stays one grid.
function FragmentRow({ children }: { slot: Slot; children: React.ReactNode }) {
  return <>{children}</>;
}
