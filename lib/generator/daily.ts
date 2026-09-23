/**
 * DAILY SPIN parameters. Everything is derived from the UTC date alone, so the
 * daily idea is identical for everyone on the same UTC day.
 */
import { dailyNumber, dailySeed, hashString, utcDateKey } from "@/lib/random";

export const DAILY_CHAOS_MIN = 25;
export const DAILY_CHAOS_MAX = 70;

export interface DailyPlan {
  /** "2026-09-23" (UTC). */
  dateKey: string;
  /** "daily-2026-09-23". */
  seed: string;
  /** Deterministic chaos in [DAILY_CHAOS_MIN, DAILY_CHAOS_MAX]. */
  chaos: number;
  /** 1-based day counter since 2026-01-01 ("DAILY // 0266"). */
  number: number;
  /** Epoch ms of that UTC midnight — the daily idea's `createdAt`. */
  createdAt: number;
}

/** Deterministic chaos level for a daily seed, uniform over 25–70. */
export function dailyChaos(seed: string): number {
  const span = DAILY_CHAOS_MAX - DAILY_CHAOS_MIN + 1;
  return DAILY_CHAOS_MIN + (hashString(`${seed}:chaos`) % span);
}

/** Valid UTC date key for `date`, or null for unparseable/impossible dates ("2026-02-30"). */
export function safeDateKey(date: Date | string): string | null {
  try {
    const key = utcDateKey(date);
    const [y, m, d] = key.split("-").map(Number);
    const midnight = Date.UTC(y, m - 1, d);
    if (!Number.isFinite(midnight)) return null;
    return new Date(midnight).toISOString().slice(0, 10) === key ? key : null;
  } catch {
    return null;
  }
}

/**
 * Plan the daily spin for a UTC date. Invalid dates fall back to the UTC day
 * of `now` rather than throwing, so a bad `?date=` never breaks a page.
 */
export function dailyPlan(date?: Date | string, now: number = Date.now()): DailyPlan {
  const key = (date !== undefined ? safeDateKey(date) : null) ?? utcDateKey(new Date(now));
  const [y, m, d] = key.split("-").map(Number);
  const seed = dailySeed(key);
  return {
    dateKey: key,
    seed,
    chaos: dailyChaos(seed),
    number: dailyNumber(key),
    createdAt: Date.UTC(y, m - 1, d),
  };
}
