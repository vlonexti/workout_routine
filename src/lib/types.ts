export type Unit = 'lb' | 'kg'
export type Goal = 'bulk' | 'cut'

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

export interface Profile {
  id: string
  name: string
  unit: Unit
  bodyweight: number
  goal: Goal
  /** Only the PRs the lifter actually entered. Missing ones get derived. */
  prs: Partial<Record<PRKey, number>>
  accent: AccentKey
  createdAt: number
}

export type AccentKey = 'ember' | 'volt' | 'ice' | 'violet' | 'lime' | 'rose'

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
  supersetWith?: string
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
  hue: string
  rest?: boolean
  alt?: string
  warmup: WarmupItem[]
  exercises: Exercise[]
  finisher: string[]
}

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
