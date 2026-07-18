// Monday-anchored week helper. weekStart is an ISO date (YYYY-MM-DD) for the Monday.
export const SLOTS = ['BREAKFAST', 'LUNCH', 'DINNER'] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_LABEL: Record<Slot, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
};
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function mondayOf(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const dow = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - dow);
  return date;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function currentWeekStart(): string {
  return toISODate(mondayOf(new Date()));
}

export function weekDates(weekStart: string): Date[] {
  const [y, m, d] = weekStart.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  return DAYS.map((_, i) => {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    return dt;
  });
}

export function weekLabel(weekStart: string): string {
  const dates = weekDates(weekStart);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(dates[0])} – ${fmt(dates[6])}`;
}
