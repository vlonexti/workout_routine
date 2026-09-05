import { supabaseKey, supabaseUrl, isConfigured } from './supabase-config'
import type {
  AccentKey,
  BodyweightEntry,
  Goal,
  Lifter,
  PRKey,
  PREntry,
  Phase,
  TargetOverrides,
  Unit,
  WednesdayVariant,
} from './types'

/*
 * PostgREST client written against fetch. The whole surface is three tables
 * and upsert/delete, which is not worth a 50 kB SDK, and doing it by hand
 * keeps every failure path visible.
 */

export const configured = isConfigured

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export class DbError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'DbError'
  }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  if (!isConfigured) throw new DbError('The database is not connected yet.')
  let res: Response
  try {
    res = await fetch(`${supabaseUrl}/rest/v1/${path}`, init)
  } catch {
    throw new DbError('Could not reach the database. Check your connection.')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    let detail = body.slice(0, 300)
    try {
      const parsed = JSON.parse(body) as { message?: string; hint?: string }
      detail = parsed.message ?? detail
    } catch {
      /* not JSON — use the raw body */
    }
    if (res.status === 404 || /relation .* does not exist/i.test(detail)) {
      throw new DbError(
        'The database is reachable but the IRON tables are missing. Run supabase/schema.sql in the SQL editor.',
        res.status,
      )
    }
    throw new DbError(detail || `Database error ${res.status}`, res.status)
  }
  return res
}

async function json<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await request(path, init)
  return (await res.json()) as T
}

export function newId(): string {
  return crypto.randomUUID()
}

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ */
/*  Row shapes                                                         */
/* ------------------------------------------------------------------ */

interface LifterRow {
  id: string
  name: string
  accent: string
  unit: string
  bodyweight: number | string
  starting_weight: number | string | null
  goal: string
  training_week: number
  wednesday: string
  kcal_target: number | null
  protein_target: number | null
  carb_target: number | null
  fat_target: number | null
  sort_order: number
  created_at: string
}

interface PRRow {
  id: string
  lifter_id: string
  lift: string
  value: number | string
  unit: string
  recorded_at: string
}

interface BodyweightRow {
  id: string
  lifter_id: string
  weight: number | string
  unit: string
  logged_on: string
}

const num = (v: number | string) => (typeof v === 'number' ? v : Number.parseFloat(v))

function toLifter(r: LifterRow, prs: Partial<Record<PRKey, number>>): Lifter {
  return {
    id: r.id,
    name: r.name,
    accent: (r.accent || 'ember') as AccentKey,
    unit: (r.unit === 'kg' ? 'kg' : 'lb') as Unit,
    bodyweight: num(r.bodyweight) || 165,
    startingWeight: r.starting_weight == null ? num(r.bodyweight) || 165 : num(r.starting_weight),
    goal: (r.goal === 'cut' ? 'cut' : 'bulk') as Goal,
    trainingWeek: r.training_week || 1,
    wednesday: ((r.wednesday === 'core' || r.wednesday === 'legs') ? r.wednesday : 'auto') as WednesdayVariant,
    targets: {
      kcal: r.kcal_target,
      protein: r.protein_target,
      carbs: r.carb_target,
      fat: r.fat_target,
    },
    sortOrder: r.sort_order ?? 0,
    prs,
    createdAt: Date.parse(r.created_at) || Date.now(),
  }
}

function toPR(r: PRRow): PREntry {
  return {
    id: r.id,
    lifterId: r.lifter_id,
    lift: r.lift as PRKey,
    value: num(r.value),
    unit: (r.unit === 'kg' ? 'kg' : 'lb') as Unit,
    recordedAt: Date.parse(r.recorded_at) || Date.now(),
  }
}

function toBodyweight(r: BodyweightRow): BodyweightEntry {
  return {
    id: r.id,
    lifterId: r.lifter_id,
    weight: num(r.weight),
    unit: (r.unit === 'kg' ? 'kg' : 'lb') as Unit,
    loggedOn: r.logged_on,
  }
}

interface PhaseRow {
  id: string
  lifter_id: string
  type: string
  start_date: string
  start_weight: number | string
  end_date: string | null
  end_weight: number | string | null
}

function toPhase(r: PhaseRow): Phase {
  return {
    id: r.id,
    lifterId: r.lifter_id,
    type: r.type === 'cut' ? 'cut' : 'bulk',
    startDate: r.start_date,
    startWeight: num(r.start_weight),
    endDate: r.end_date,
    endWeight: r.end_weight == null ? null : num(r.end_weight),
  }
}

/** Newest entry per lift wins — that is the lifter's current PR. */
export function currentPRs(entries: PREntry[]): Partial<Record<PRKey, number>> {
  const out: Partial<Record<PRKey, number>> = {}
  const seen: Partial<Record<PRKey, number>> = {}
  for (const e of entries) {
    const at = seen[e.lift]
    if (at === undefined || e.recordedAt > at) {
      seen[e.lift] = e.recordedAt
      out[e.lift] = e.value
    }
  }
  return out
}

/* ------------------------------------------------------------------ */
/*  Reads                                                              */
/* ------------------------------------------------------------------ */

export interface Snapshot {
  lifters: Lifter[]
  prEntries: PREntry[]
  bodyweight: BodyweightEntry[]
  phases: Phase[]
}

/** Everything the app needs, in four parallel requests. */
export async function loadAll(): Promise<Snapshot> {
  // 120 days of history is plenty for deltas and the "last session" line, and
  // keeps the payload small enough to fetch on every load.
  const since = today(new Date(Date.now() - 120 * 86_400_000))

  const [lifterRows, prRows, bwRows, phaseRows] = await Promise.all([
    json<LifterRow[]>('lifters?select=*&order=sort_order.asc,created_at.asc', { headers: headers() }),
    json<PRRow[]>('pr_entries?select=*&order=recorded_at.asc', { headers: headers() }),
    json<BodyweightRow[]>(`bodyweight_entries?select=*&logged_on=gte.${since}&order=logged_on.asc`, {
      headers: headers(),
    }),
    // Tolerate a database that has not had the phases migration run yet:
    // the rest of the app works fine without it, so a missing table should
    // hide the phase features rather than take the whole site down.
    json<PhaseRow[]>('phases?select=*&order=start_date.asc', { headers: headers() }).catch(
      () => [] as PhaseRow[],
    ),
  ])

  const prEntries = prRows.map(toPR)
  const byLifter = new Map<string, PREntry[]>()
  for (const e of prEntries) {
    const list = byLifter.get(e.lifterId)
    if (list) list.push(e)
    else byLifter.set(e.lifterId, [e])
  }

  return {
    lifters: lifterRows.map((r) => toLifter(r, currentPRs(byLifter.get(r.id) ?? []))),
    prEntries,
    bodyweight: bwRows.map(toBodyweight),
    phases: phaseRows.map(toPhase),
  }
}

/* ------------------------------------------------------------------ */
/*  Writes                                                             */
/* ------------------------------------------------------------------ */

const MINIMAL = { Prefer: 'return=minimal' }
const UPSERT = { Prefer: 'resolution=merge-duplicates,return=minimal' }

type LifterPatch = Partial<
  Pick<
    Lifter,
    | 'name'
    | 'accent'
    | 'unit'
    | 'bodyweight'
    | 'startingWeight'
    | 'goal'
    | 'trainingWeek'
    | 'wednesday'
    | 'sortOrder'
  >
> & { targets?: TargetOverrides }

function lifterPayload(patch: LifterPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (patch.name !== undefined) out.name = patch.name
  if (patch.accent !== undefined) out.accent = patch.accent
  if (patch.unit !== undefined) out.unit = patch.unit
  if (patch.bodyweight !== undefined) out.bodyweight = patch.bodyweight
  if (patch.startingWeight !== undefined) out.starting_weight = patch.startingWeight
  if (patch.goal !== undefined) out.goal = patch.goal
  if (patch.trainingWeek !== undefined) out.training_week = patch.trainingWeek
  if (patch.wednesday !== undefined) out.wednesday = patch.wednesday
  if (patch.sortOrder !== undefined) out.sort_order = patch.sortOrder
  if (patch.targets) {
    out.kcal_target = patch.targets.kcal
    out.protein_target = patch.targets.protein
    out.carb_target = patch.targets.carbs
    out.fat_target = patch.targets.fat
  }
  return out
}

export async function updateLifter(id: string, patch: LifterPatch): Promise<void> {
  const body = lifterPayload(patch)
  if (!Object.keys(body).length) return
  await request(`lifters?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers(MINIMAL),
    body: JSON.stringify(body),
  })
}

export async function insertLifter(lifter: Lifter): Promise<void> {
  await request('lifters', {
    method: 'POST',
    headers: headers(MINIMAL),
    body: JSON.stringify([
      {
        id: lifter.id,
        name: lifter.name,
        accent: lifter.accent,
        unit: lifter.unit,
        bodyweight: lifter.bodyweight,
        starting_weight: lifter.startingWeight,
        goal: lifter.goal,
        training_week: lifter.trainingWeek,
        wednesday: lifter.wednesday,
        sort_order: lifter.sortOrder,
      },
    ]),
  })
}

export async function deleteLifter(id: string): Promise<void> {
  // pr_entries, bodyweight_entries and set_logs cascade from the FK.
  await request(`lifters?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(MINIMAL),
  })
}

export async function insertPR(entry: PREntry): Promise<void> {
  await request('pr_entries', {
    method: 'POST',
    headers: headers(MINIMAL),
    body: JSON.stringify([
      {
        id: entry.id,
        lifter_id: entry.lifterId,
        lift: entry.lift,
        value: entry.value,
        unit: entry.unit,
        recorded_at: new Date(entry.recordedAt).toISOString(),
      },
    ]),
  })
}

/** Clearing a PR drops its history for that lift, so it falls back to derived. */
export async function deletePRLift(lifterId: string, lift: PRKey): Promise<void> {
  await request(
    `pr_entries?lifter_id=eq.${encodeURIComponent(lifterId)}&lift=eq.${encodeURIComponent(lift)}`,
    { method: 'DELETE', headers: headers(MINIMAL) },
  )
}

export async function upsertBodyweight(entry: BodyweightEntry): Promise<void> {
  await request('bodyweight_entries?on_conflict=lifter_id,logged_on', {
    method: 'POST',
    headers: headers(UPSERT),
    body: JSON.stringify([
      {
        id: entry.id,
        lifter_id: entry.lifterId,
        weight: entry.weight,
        unit: entry.unit,
        logged_on: entry.loggedOn,
      },
    ]),
  })
}

/** True when there is not a single lifter yet — used to gate the import. */
export async function isEmpty(): Promise<boolean> {
  const rows = await json<{ id: string }[]>('lifters?select=id&limit=1', { headers: headers() })
  return rows.length === 0
}

/* ------------------------------------------------------------------ */
/*  Phases                                                             */
/* ------------------------------------------------------------------ */

export async function insertPhase(phase: Phase): Promise<void> {
  await request('phases', {
    method: 'POST',
    headers: headers(MINIMAL),
    body: JSON.stringify([
      {
        id: phase.id,
        lifter_id: phase.lifterId,
        type: phase.type,
        start_date: phase.startDate,
        start_weight: phase.startWeight,
        end_date: phase.endDate,
        end_weight: phase.endWeight,
      },
    ]),
  })
}

/** Closes an open phase with the date and weight it finished at. */
export async function closePhase(id: string, endDate: string, endWeight: number): Promise<void> {
  await request(`phases?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers(MINIMAL),
    body: JSON.stringify({ end_date: endDate, end_weight: endWeight }),
  })
}

export async function updatePhase(
  id: string,
  patch: { startDate?: string; startWeight?: number },
): Promise<void> {
  const body: Record<string, unknown> = {}
  if (patch.startDate !== undefined) body.start_date = patch.startDate
  if (patch.startWeight !== undefined) body.start_weight = patch.startWeight
  if (!Object.keys(body).length) return
  await request(`phases?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers(MINIMAL),
    body: JSON.stringify(body),
  })
}
