export type Unit = 'lb' | 'kg'
export type Goal = 'bulk' | 'cut'
export type WednesdayVariant = 'legs' | 'arms'

/** Every lift we track a personal record for. Everything else is a % of one of these. */
export type PRKey =
  | 'bench'
  | 'inclineBench'
  | 'cgbp'
  | 'ohp'
  | 'dbBench'
  | 'squat'
  | 'deadlift'
  | 'rdl'
  | 'row'
  | 'dbRow'
  | 'pulldown'
  | 'pullup'
  | 'curl'

export const PR_KEYS: PRKey[] = [
  'bench',
  'inclineBench',
  'cgbp',
  'ohp',
  'dbBench',
  'squat',
  'deadlift',
  'rdl',
  'row',
  'dbRow',
  'pulldown',
  'pullup',
  'curl',
]

export type AccentKey = 'ember' | 'ice' | 'volt' | 'violet' | 'lime' | 'rose'

/** Nutrition targets a lifter has deliberately pinned. Null means "calculate it". */
export interface TargetOverrides {
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

/**
 * One athlete. `prs` is derived on read from the newest pr_entries row per
 * lift, so the shape stays exactly what calc.ts already expects.
 */
export interface Lifter {
  id: string
  name: string
  unit: Unit
  bodyweight: number
  goal: Goal
  prs: Partial<Record<PRKey, number>>
  accent: AccentKey
  trainingWeek: number
  wednesday: WednesdayVariant
  targets: TargetOverrides
  sortOrder: number
  createdAt: number
}

/** calc.ts is written against this name; keep it working untouched. */
export type Profile = Lifter

export interface PREntry {
  id: string
  lifterId: string
  lift: PRKey
  value: number
  unit: Unit
  recordedAt: number
}

export interface BodyweightEntry {
  id: string
  lifterId: string
  weight: number
  unit: Unit
  loggedOn: string
}

export interface SetLog {
  id: string
  lifterId: string
  performedOn: string
  dayKey: string
  exerciseId: string
  setIndex: number
  weight: number | null
  reps: number | null
  trainingWeek: number | null
}

/* ------------------------------------------------------------------ */
/*  Program                                                            */
/* ------------------------------------------------------------------ */

export type Equip =
  | 'Barbell'
  | 'EZ Bar'
  | 'Dumbbell'
  | 'Cable'
  | 'Machine'
  | 'Bodyweight'
  | 'Rack'

export type Tag = 'main' | 'secondary' | 'accessory' | 'finisher' | 'core'

export interface Exercise {
  id: string
  name: string
  equip: Equip
  /** Which PR this lift is loaded off of. */
  pr?: PRKey
  /** Fraction of that PR's 1RM. */
  pct?: number
  /** Weight shown is per hand (dumbbells). */
  perHand?: boolean
  /** Load includes bodyweight (pull-ups, dips) — we show the added plate weight. */
  bodyweightBased?: boolean
  sets: number
  reps: string
  /** Average seconds a single working set takes. Used for the time estimate. */
  setSeconds: number
  /** Rest between sets, in seconds. */
  rest: number
  rpe?: string
  cue: string
  why?: string
  tag: Tag
  /** Shown instead of a calculated number when there is no sane PR mapping. */
  loadNote?: string
}

export interface WarmupItem {
  name: string
  detail: string
  minutes: number
}

export interface Day {
  key: string
  weekday: string
  short: string
  title: string
  focus: string
  blurb: string
  rest?: boolean
  alt?: string
  warmup: WarmupItem[]
  exercises: Exercise[]
  finisher: string[]
}

/* ------------------------------------------------------------------ */
/*  Nutrition                                                          */
/* ------------------------------------------------------------------ */

export interface Food {
  id: string
  name: string
  where: string
  serving: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  cost?: string
}

export interface Recipe {
  id: string
  name: string
  slot: 'Breakfast' | 'Pre-lift' | 'Post-lift' | 'Dinner' | 'Snack' | 'Before bed'
  time: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  blurb: string
  ingredients: string[]
  steps: string[]
  goals: Goal[]
  swap?: string
}
