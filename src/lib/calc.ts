import type { Exercise, PRKey, Profile, Unit } from './types'

/* ------------------------------------------------------------------ */
/*  PR resolution                                                      */
/* ------------------------------------------------------------------ */

/**
 * If a lifter hasn't tested a lift, we derive it from one they have.
 * Ratios are the usual strength-standard relationships, so the whole
 * program is usable the moment someone types in a single bench number.
 */
const DERIVED: Record<PRKey, { from: PRKey | 'bodyweight'; ratio: number } | null> = {
  bench: null, // root — falls back to a sane beginner default
  squat: { from: 'bench', ratio: 1.3 },
  deadlift: { from: 'squat', ratio: 1.2 },
  inclineBench: { from: 'bench', ratio: 0.85 },
  cgbp: { from: 'bench', ratio: 0.88 },
  ohp: { from: 'bench', ratio: 0.63 },
  dbBench: { from: 'bench', ratio: 0.36 }, // per dumbbell
  row: { from: 'deadlift', ratio: 0.55 },
  dbRow: { from: 'row', ratio: 0.52 }, // per dumbbell
  pulldown: { from: 'row', ratio: 0.95 },
  rdl: { from: 'deadlift', ratio: 0.68 },
  curl: { from: 'bench', ratio: 0.36 },
  pullup: { from: 'bodyweight', ratio: 1.15 }, // total system weight
}

const ROOT_DEFAULT_LB = 135

export interface ResolvedPR {
  value: number
  /** true when the lifter typed it in, false when we inferred it */
  entered: boolean
  from?: PRKey | 'bodyweight'
}

export function resolvePR(profile: Profile, key: PRKey, seen: PRKey[] = []): ResolvedPR {
  const own = profile.prs[key]
  if (own && own > 0) return { value: own, entered: true }

  const rule = DERIVED[key]
  const rootFallback = profile.unit === 'kg' ? Math.round(ROOT_DEFAULT_LB / 2.2) : ROOT_DEFAULT_LB

  if (!rule) return { value: rootFallback, entered: false }

  if (rule.from === 'bodyweight') {
    return { value: profile.bodyweight * rule.ratio, entered: false, from: 'bodyweight' }
  }
  if (seen.includes(rule.from)) {
    return { value: rootFallback * rule.ratio, entered: false, from: rule.from }
  }
  const parent = resolvePR(profile, rule.from, [...seen, key])
  return { value: parent.value * rule.ratio, entered: false, from: rule.from }
}

/* ------------------------------------------------------------------ */
/*  Weekly wave                                                        */
/* ------------------------------------------------------------------ */

export interface WeekSpec {
  week: number
  label: string
  name: string
  /**
   * Scales the exercise's base percentage. Multiplicative rather than additive
   * on purpose: a flat "-12 percentage points" deload is right for a 82% bench
   * but would wipe out an accessory prescribed at 12% of squat.
   */
  pctMultiplier: number
  setMultiplier: number
  note: string
}

export const WEEKS: WeekSpec[] = [
  {
    week: 1,
    label: 'W1',
    name: 'Accumulate',
    pctMultiplier: 1,
    setMultiplier: 1,
    note: 'Baseline loads. Every rep crisp — leave about 2 in the tank on the last set of the main lift.',
  },
  {
    week: 2,
    label: 'W2',
    name: 'Build',
    pctMultiplier: 1.03,
    setMultiplier: 1,
    note: 'Same sets, a touch heavier. This is the week the size actually shows up.',
  },
  {
    week: 3,
    label: 'W3',
    name: 'Peak',
    pctMultiplier: 1.06,
    setMultiplier: 1,
    note: 'Heaviest week. Last set of every main lift goes to 1 rep in reserve. Get a spotter.',
  },
  {
    week: 4,
    label: 'W4',
    name: 'Deload',
    pctMultiplier: 0.85,
    setMultiplier: 0.6,
    note: 'Load and sets both drop. You grow this week — do not fight it. Retest PRs on Monday of the next W1.',
  },
]

export function weekSpec(week: number): WeekSpec {
  return WEEKS[(week - 1) % WEEKS.length] ?? WEEKS[0]
}

/* ------------------------------------------------------------------ */
/*  Loading                                                            */
/* ------------------------------------------------------------------ */

/** Smallest jump you can actually make on the equipment in the room. */
function increment(unit: Unit, equip: Exercise['equip']): number {
  if (unit === 'kg') return equip === 'Dumbbell' ? 2 : 2.5
  return 5
}

export function roundLoad(weight: number, unit: Unit, equip: Exercise['equip']): number {
  const inc = increment(unit, equip)
  return Math.max(inc, Math.round(weight / inc) * inc)
}

export interface Loading {
  /** Number to put on the bar / pick off the rack. */
  weight: number
  /** Human string, e.g. "225 lb" or "70 lb / hand" or "+45 lb". */
  display: string
  /** Percentage actually used after the weekly wave. */
  pct: number | null
  /** True when we're working off a derived PR rather than a tested one. */
  estimated: boolean
  /** Explanation shown on the card, e.g. "72% of Bench Press 275 lb". */
  basis: string | null
}

export const PR_LABEL: Record<PRKey, string> = {
  bench: 'Bench Press',
  inclineBench: 'Incline Bench',
  cgbp: 'Close-Grip Bench',
  ohp: 'Overhead Press',
  dbBench: 'DB Bench',
  squat: 'Back Squat',
  deadlift: 'Deadlift',
  rdl: 'Romanian Deadlift',
  row: 'Barbell Row',
  dbRow: 'DB Row',
  pulldown: 'Lat Pulldown',
  pullup: 'Pull-up',
  curl: 'Barbell / EZ Curl',
}

export const PR_HINT: Record<PRKey, string> = {
  bench: 'Flat barbell, one clean rep, paused on the chest.',
  inclineBench: '30-45 degree incline, barbell.',
  cgbp: 'Hands just inside shoulder width, elbows tucked.',
  ohp: 'Standing, strict, no leg drive.',
  dbBench: 'Weight of ONE dumbbell, not the pair.',
  squat: 'Back squat to at least parallel in the rack.',
  deadlift: 'Conventional, floor to lockout.',
  rdl: 'Romanian deadlift for a hard 5. Estimate is fine.',
  row: 'Bent-over barbell row, torso around 45 degrees.',
  dbRow: 'Weight of ONE dumbbell.',
  pulldown: 'Heaviest pin you can pull for 1 clean rep.',
  pullup: 'Bodyweight PLUS any added plate. Just bodyweight? Enter your bodyweight.',
  curl: 'Straight or EZ bar, strict, no swinging.',
}

export function computeLoad(profile: Profile, ex: Exercise, week: number): Loading {
  // No PR mapping — the lifter picks the weight. Keep the headline short; the
  // exercise's own loadNote carries the actual guidance.
  if (!ex.pr || ex.pct == null) {
    return { weight: 0, display: 'By feel', pct: null, estimated: false, basis: null }
  }
  const spec = weekSpec(week)
  const pct = ex.pct * spec.pctMultiplier
  const pr = resolvePR(profile, ex.pr)
  const u = profile.unit
  const raw = pr.value * pct

  if (ex.bodyweightBased) {
    // pr.value is total system weight; strip bodyweight to get the plates on the belt.
    const inc = increment(u, ex.equip)
    const added = Math.round((raw - profile.bodyweight) / inc) * inc
    return {
      weight: added,
      display: added <= 0 ? 'Bodyweight' : `+${added} ${u}`,
      pct,
      estimated: !pr.entered,
      basis: `${Math.round(pct * 100)}% of ${Math.round(pr.value)} ${u} total (you + plates)`,
    }
  }

  const w = roundLoad(raw, u, ex.equip)
  return {
    weight: w,
    display: ex.perHand ? `${w} ${u} each` : `${w} ${u}`,
    pct,
    estimated: !pr.entered,
    basis: `${Math.round(pct * 100)}% of ${PR_LABEL[ex.pr]} ${Math.round(pr.value)} ${u}`,
  }
}

/** Plates per side for a standard 45 lb / 20 kg bar. */
export function plateBreakdown(total: number, unit: Unit): string | null {
  const bar = unit === 'kg' ? 20 : 45
  if (total <= bar) return null
  const plates = unit === 'kg' ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5]
  let perSide = (total - bar) / 2
  const out: string[] = []
  for (const p of plates) {
    let n = 0
    while (perSide >= p - 0.001) {
      perSide -= p
      n++
    }
    if (n) out.push(n > 1 ? `${n}x${p}` : `${p}`)
  }
  if (!out.length) return null
  return out.join(' + ') + ' per side'
}

/* ------------------------------------------------------------------ */
/*  Session timing                                                     */
/* ------------------------------------------------------------------ */

/**
 * Seconds of walking over, loading plates, and talking around each exercise.
 * Deliberately generous — this is a session with a training partner, not a
 * stopwatch time trial.
 */
const SETUP_SECONDS = 180

export function exerciseSets(ex: Exercise, week: number): number {
  const spec = weekSpec(week)
  return Math.max(2, Math.round(ex.sets * spec.setMultiplier))
}

export function exerciseSeconds(ex: Exercise, week: number): number {
  const sets = exerciseSets(ex, week)
  return SETUP_SECONDS + sets * ex.setSeconds + (sets - 1) * ex.rest
}

export function sessionMinutes(
  warmup: { minutes: number }[],
  exercises: Exercise[],
  week: number,
): number {
  const warm = warmup.reduce((a, b) => a + b.minutes, 0)
  const work = exercises.reduce((a, e) => a + exerciseSeconds(e, week), 0) / 60
  return Math.round(warm + work + 6) // + cooldown and walking out
}

export function fmtMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

export function fmtClock(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60)
  const s = Math.max(0, seconds) % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Epley — powers the 1RM calculator on the PR page. */
export function estimate1RM(weight: number, reps: number): number {
  if (!weight || reps < 1) return 0
  if (reps === 1) return Math.round(weight)
  return Math.round(weight * (1 + reps / 30))
}

/* ------------------------------------------------------------------ */
/*  Nutrition targets                                                  */
/* ------------------------------------------------------------------ */

export interface Targets {
  kcal: number
  protein: number
  carbs: number
  fat: number
  waterOz: number
}

export function targetsFor(profile: Profile, goalOverride?: Profile['goal']): Targets {
  const goal = goalOverride ?? profile.goal
  const lb = profile.unit === 'kg' ? profile.bodyweight * 2.2046 : profile.bodyweight
  const kcal = Math.round(((goal === 'bulk' ? 18.5 : 12.5) * lb) / 10) * 10
  const protein = Math.round((goal === 'bulk' ? 1.0 : 1.15) * lb)
  const fat = Math.round((goal === 'bulk' ? 0.42 : 0.35) * lb)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat, waterOz: Math.round(lb / 2 / 8) * 8 }
}
