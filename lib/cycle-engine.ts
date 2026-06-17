// Cycle engine — pure, deterministic calculations driven by the user's
// hormonal profile (last period date, cycle length, period length).
// All dates use the user's local Sao_Paulo calendar to avoid TZ drift.

import type { CyclePhase } from "./personalization";

export const TZ = "America/Sao_Paulo";

export function todayKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Parse YYYY-MM-DD as UTC midnight (stable across runtimes). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function formatISODate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return formatISODate(d);
}

export function diffDays(aIso: string, bIso: string): number {
  return Math.round(
    (parseISODate(bIso).getTime() - parseISODate(aIso).getTime()) / 86400000,
  );
}

export interface CycleProfileInput {
  last_period_date?: string | null;
  cycle_length?: number | null;
  period_length?: number | null;
}

export interface CycleSnapshot {
  hasData: boolean;
  cycleDay: number;
  cycleLength: number;
  periodLength: number;
  phase: CyclePhase;
  ovulationDay: number;
  fertileStart: number;
  fertileEnd: number;
  /** Anchor = start of the current cycle (ISO). */
  currentCycleStart: string;
  nextPeriodDate: string;
  ovulationDate: string;
  fertileStartDate: string;
  fertileEndDate: string;
  daysToNextPeriod: number;
  daysToOvulation: number;
}

function clampLen(n: number | null | undefined, fallback: number, min: number, max: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(Math.max(Math.round(v), min), max);
}

export function phaseForDay(
  cycleDay: number,
  periodLength: number,
  cycleLength: number,
): CyclePhase {
  const ovulation = Math.max(periodLength + 1, cycleLength - 14);
  if (cycleDay <= periodLength) return "menstrual";
  if (cycleDay < ovulation - 1) return "follicular";
  if (cycleDay <= ovulation + 1) return "ovulation";
  return "luteal";
}

export function buildCycleSnapshot(
  profile: CycleProfileInput | null | undefined,
  today: string = todayKey(),
): CycleSnapshot {
  const cycleLength = clampLen(profile?.cycle_length, 28, 15, 60);
  const periodLength = clampLen(profile?.period_length, 5, 1, 15);
  const last = profile?.last_period_date;

  if (!last) {
    const ov = Math.max(periodLength + 1, cycleLength - 14);
    return {
      hasData: false,
      cycleDay: 1,
      cycleLength,
      periodLength,
      phase: "menstrual",
      ovulationDay: ov,
      fertileStart: ov - 3,
      fertileEnd: ov + 1,
      currentCycleStart: today,
      nextPeriodDate: addDays(today, cycleLength),
      ovulationDate: addDays(today, ov - 1),
      fertileStartDate: addDays(today, ov - 4),
      fertileEndDate: addDays(today, ov),
      daysToNextPeriod: cycleLength,
      daysToOvulation: ov - 1,
    };
  }

  // Use floor-based arithmetic so dates BEFORE the anchor still map to a real
  // cycle (the previous one) instead of being clamped to "day 1 menstrual".
  const diff = diffDays(last, today);
  const cyclesElapsed = Math.floor(diff / cycleLength);
  const currentCycleStart = addDays(last, cyclesElapsed * cycleLength);
  const cycleDay = diff - cyclesElapsed * cycleLength + 1;

  const ovulationDay = Math.max(periodLength + 1, cycleLength - 14);
  const phase = phaseForDay(cycleDay, periodLength, cycleLength);

  const nextPeriodDate = addDays(currentCycleStart, cycleLength);
  const ovulationDate = addDays(currentCycleStart, ovulationDay - 1);
  const fertileStartDate = addDays(currentCycleStart, ovulationDay - 4);
  const fertileEndDate = addDays(currentCycleStart, ovulationDay);

  return {
    hasData: true,
    cycleDay,
    cycleLength,
    periodLength,
    phase,
    ovulationDay,
    fertileStart: ovulationDay - 3,
    fertileEnd: ovulationDay + 1,
    currentCycleStart,
    nextPeriodDate,
    ovulationDate,
    fertileStartDate,
    fertileEndDate,
    daysToNextPeriod: Math.max(0, diffDays(today, nextPeriodDate)),
    daysToOvulation: diffDays(today, ovulationDate),
  };
}

export interface CalendarDay {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  cycleDay: number | null;
  phase: CyclePhase | null;
  isPeriod: boolean;
  isFertile: boolean;
  isOvulation: boolean;
}

/** Build a Sun..Sat 6-row grid for a given month. */
export function buildMonthGrid(
  year: number,
  month: number, // 0-based
  profile: CycleProfileInput | null | undefined,
  today: string = todayKey(),
): CalendarDay[] {
  const cycleLength = clampLen(profile?.cycle_length, 28, 15, 60);
  const periodLength = clampLen(profile?.period_length, 5, 1, 15);
  const last = profile?.last_period_date ?? null;

  const first = new Date(Date.UTC(year, month, 1));
  const startWeekday = first.getUTCDay(); // 0=Sun
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: CalendarDay[] = [];
  // Leading blank placeholders to preserve weekday alignment (no foreign-month dates).
  for (let i = 0; i < startWeekday; i++) {
    cells.push({
      iso: `blank-lead-${i}`,
      day: 0,
      inMonth: false,
      isToday: false,
      cycleDay: null,
      phase: null,
      isPeriod: false,
      isFertile: false,
      isOvulation: false,
    });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(Date.UTC(year, month, day));
    cells.push(buildCell(d, true, last, cycleLength, periodLength, today));
  }
  // No trailing fill — empty space after the last day stays blank.
  return cells;
}

function buildCell(
  d: Date,
  inMonth: boolean,
  lastPeriodIso: string | null,
  cycleLength: number,
  periodLength: number,
  today: string,
): CalendarDay {
  const iso = formatISODate(d);
  const day = d.getUTCDate();
  const base: CalendarDay = {
    iso,
    day,
    inMonth,
    isToday: iso === today,
    cycleDay: null,
    phase: null,
    isPeriod: false,
    isFertile: false,
    isOvulation: false,
  };
  if (!lastPeriodIso) return base;

  // Compute cycle day for ANY date (past or future) via modulo so the calendar
  // is fully populated across every cycle, not only dates after the anchor.
  const diff = diffDays(lastPeriodIso, iso);
  const mod = ((diff % cycleLength) + cycleLength) % cycleLength;
  const cycleDay = mod + 1;
  const phase = phaseForDay(cycleDay, periodLength, cycleLength);
  const ovulationDay = Math.max(periodLength + 1, cycleLength - 14);

  return {
    ...base,
    cycleDay,
    phase,
    isPeriod: cycleDay <= periodLength,
    isOvulation: cycleDay === ovulationDay,
    isFertile: cycleDay >= ovulationDay - 3 && cycleDay <= ovulationDay + 1,
  };
}

/** Returns ms until next local midnight (Sao_Paulo). */
export function msUntilNextLocalMidnight(now: Date = new Date()): number {
  const today = todayKey(now);
  // Build "tomorrow" string by adding one day in UTC space, but compare via SP formatter loop
  // Simple approach: poll every minute until the date string changes.
  const tomorrowMs = 60 * 1000;
  return tomorrowMs; // we re-check every minute; cheap and tz-safe
}
