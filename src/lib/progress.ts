import type { BodyweightEntry, Goal, Lifter, Phase, Unit } from './types'

/*
 * Everything here is derived from weigh-ins the lifter actually entered.
 * When the history is too thin to say anything, these return null and the UI
 * asks for another weigh-in rather than inventing a trend.
 */

/** Typical length of each phase, used only to frame "roughly how far in". */
const BULK_TYPICAL_WEEKS = 20 // ~5 months
const CUT_TYPICAL_WEEKS = 10

/** Sensible weekly rate bands, in lb per week. */
const TARGET_RATE: Record<Goal, { min: number; max: number }> = {
  bulk: { min: 0.5, max: 1 },
  cut: { min: -1.5, max: -1 },
}

const MS_DAY = 86_400_000

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((parseDate(toISO).getTime() - parseDate(fromISO).getTime()) / MS_DAY)
}

export function formatDate(iso: string): string {
  return parseDate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatMonth(iso: string): string {
  return parseDate(iso).toLocaleDateString(undefined, { month: 'long' })
}

/** Signed weight string, e.g. "+7.0 lb" / "-2.5 lb". */
export function signedWeight(delta: number, unit: Unit): string {
  const rounded = Math.round(delta * 10) / 10
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded)} ${unit}`
}

/* ------------------------------------------------------------------ */
/*  Weigh-in history                                                   */
/* ------------------------------------------------------------------ */

export function historyFor(entries: BodyweightEntry[], lifterId: string): BodyweightEntry[] {
  return entries
    .filter((e) => e.lifterId === lifterId)
    .sort((a, b) => a.loggedOn.localeCompare(b.loggedOn))
}

/** The weigh-in already recorded this calendar month, if there is one. */
export function entryThisMonth(
  entries: BodyweightEntry[],
  lifterId: string,
  now = new Date(),
): BodyweightEntry | null {
  const key = monthKey(todayISO(now))
  return historyFor(entries, lifterId).find((e) => monthKey(e.loggedOn) === key) ?? null
}

export interface Trend {
  first: BodyweightEntry
  latest: BodyweightEntry
  change: number
  days: number
  /** lb per week. Null when the span is too short to mean anything. */
  perWeek: number | null
}

/**
 * Change across the recorded weigh-ins. Requires two entries on different
 * days — this is what stops the old "+5 lb since today" nonsense, which came
 * from comparing an entry against itself.
 */
export function trendFor(entries: BodyweightEntry[], lifterId: string): Trend | null {
  const h = historyFor(entries, lifterId)
  if (h.length < 2) return null
  const first = h[0]
  const latest = h[h.length - 1]
  const days = daysBetween(first.loggedOn, latest.loggedOn)
  if (days < 1) return null
  const change = latest.weight - first.weight
  // Under a fortnight a weekly rate is mostly water weight; do not report one.
  const perWeek = days >= 14 ? (change / days) * 7 : null
  return { first, latest, change, days, perWeek }
}

/* ------------------------------------------------------------------ */
/*  Phases                                                             */
/* ------------------------------------------------------------------ */

export function openPhase(phases: Phase[], lifterId: string): Phase | null {
  return phases.find((p) => p.lifterId === lifterId && p.endDate === null) ?? null
}

export function phaseHistory(phases: Phase[], lifterId: string): Phase[] {
  return phases
    .filter((p) => p.lifterId === lifterId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
}

export interface PhaseProgress {
  phase: Phase
  weeksIn: number
  typicalWeeks: number
  startWeight: number
  currentWeight: number
  change: number
  /** From the phase's own weigh-ins. Null when there is not enough yet. */
  perWeek: number | null
  /** Weeks left at the current rate, or against a typical phase length. */
  weeksRemaining: [number, number] | null
  reviewMonth: string | null
  /** Plain-language read on the rate. */
  verdict: 'on-track' | 'fast' | 'slow' | 'unknown'
  advice: string
}

/**
 * Where the lifter is in the phase they are currently running. Deliberately
 * hedged: the weekly rate only appears once two weigh-ins are at least a
 * fortnight apart, and the remaining estimate is always a range.
 */
export function phaseProgress(
  lifter: Lifter,
  phase: Phase,
  entries: BodyweightEntry[],
  now = new Date(),
): PhaseProgress {
  const today = todayISO(now)
  const typicalWeeks = phase.type === 'bulk' ? BULK_TYPICAL_WEEKS : CUT_TYPICAL_WEEKS
  const weeksIn = Math.max(0, daysBetween(phase.startDate, today) / 7)

  // Only weigh-ins from inside this phase describe this phase's rate. The
  // headline number stays the lifter's current bodyweight so the phase strip
  // and the Current figure above it can never disagree.
  const inPhase = historyFor(entries, lifter.id).filter((e) => e.loggedOn >= phase.startDate)
  const currentWeight = lifter.bodyweight
  const change = currentWeight - phase.startWeight

  let perWeek: number | null = null
  if (inPhase.length >= 2) {
    const days = daysBetween(inPhase[0].loggedOn, inPhase[inPhase.length - 1].loggedOn)
    if (days >= 14) {
      perWeek = ((inPhase[inPhase.length - 1].weight - inPhase[0].weight) / days) * 7
    }
  }

  const target = TARGET_RATE[phase.type]
  let verdict: PhaseProgress['verdict'] = 'unknown'
  if (perWeek != null) {
    if (phase.type === 'bulk') {
      verdict = perWeek > target.max ? 'fast' : perWeek < target.min ? 'slow' : 'on-track'
    } else {
      verdict = perWeek < target.min ? 'fast' : perWeek > target.max ? 'slow' : 'on-track'
    }
  }

  const left = Math.max(0, typicalWeeks - weeksIn)
  const weeksRemaining: [number, number] | null =
    left <= 0 ? null : [Math.max(1, Math.round(left * 0.8)), Math.round(left * 1.2)]

  let reviewMonth: string | null = null
  if (weeksRemaining) {
    const d = new Date(now.getTime() + weeksRemaining[0] * 7 * MS_DAY)
    reviewMonth = formatMonth(todayISO(d))
  }

  let advice: string
  if (perWeek == null) {
    advice =
      inPhase.length >= 2
        ? 'Another few weeks of weigh-ins will make this estimate meaningful.'
        : 'Add your next monthly weigh-in to improve this estimate.'
  } else if (verdict === 'fast') {
    advice =
      phase.type === 'bulk'
        ? 'Gaining faster than target — trim calories slightly or end the bulk sooner.'
        : 'Losing faster than target — add a little food to protect strength.'
  } else if (verdict === 'slow') {
    advice =
      phase.type === 'bulk'
        ? 'Gaining slower than target — add roughly 150-200 kcal a day.'
        : 'Losing slower than target — tighten portions or add daily steps.'
  } else if (weeksRemaining) {
    advice =
      phase.type === 'bulk'
        ? `On target. Continue roughly another ${Math.round(weeksRemaining[0] / 4)}-${Math.round(weeksRemaining[1] / 4)} months, then reassess.`
        : `On target. At this rate expect roughly another ${weeksRemaining[0]}-${weeksRemaining[1]} weeks.`
  } else {
    advice = 'You are past a typical phase length — worth reassessing soon.'
  }

  return {
    phase,
    weeksIn,
    typicalWeeks,
    startWeight: phase.startWeight,
    currentWeight,
    change,
    perWeek,
    weeksRemaining,
    reviewMonth,
    verdict,
    advice,
  }
}

/** "Month 2 of ~5" for a bulk, "Week 4 of ~10" for a cut. */
export function phasePosition(p: PhaseProgress): string {
  if (p.phase.type === 'bulk') {
    const month = Math.max(1, Math.floor(p.weeksIn / 4) + 1)
    return `Month ${month} of ~${Math.round(p.typicalWeeks / 4)}`
  }
  const week = Math.max(1, Math.floor(p.weeksIn) + 1)
  return `Week ${week} of ~${p.typicalWeeks}`
}

export const PHASE_LABEL: Record<Goal, string> = { bulk: 'Lean bulk', cut: 'Cut' }
