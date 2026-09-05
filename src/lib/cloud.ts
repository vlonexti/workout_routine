import { cloudKey, cloudUrl, isCloudConfigured } from './cloud-config'
import type { AccentKey, Goal, PRKey, Profile, Unit } from './types'

/*
 * A small PostgREST client for Supabase, written against fetch directly.
 * The whole surface we need is four tables and upsert/delete, which is not
 * worth a 50 kB SDK — and doing it by hand keeps every failure path visible.
 */

export interface SharedSettings {
  week: number
  wednesday: 'legs' | 'arms'
}

/** One completed set. Stamped with the date so each session starts clean. */
export interface SetLog {
  id: string
  profileId: string
  dayStamp: string
  dayKey: string
  exerciseId: string
  setIndex: number
}

export interface Snapshot {
  profiles: Profile[]
  settings: SharedSettings
  logs: SetLog[]
}

export const cloudEnabled = isCloudConfigured

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: cloudKey,
    Authorization: `Bearer ${cloudKey}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${cloudUrl}/rest/v1/${path}`, init)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Supabase ${res.status}: ${body.slice(0, 200) || res.statusText}`)
  }
  return res
}

/* ------------------------------------------------------------------ */
/*  Row <-> app shape                                                  */
/* ------------------------------------------------------------------ */

interface ProfileRow {
  id: string
  name: string
  unit: string
  bodyweight: number | string
  goal: string
  accent: string
  prs: Partial<Record<PRKey, number>> | null
  created_at: string | null
}

function toProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    name: r.name,
    unit: (r.unit === 'kg' ? 'kg' : 'lb') as Unit,
    bodyweight: Number(r.bodyweight) || 165,
    goal: (r.goal === 'cut' ? 'cut' : 'bulk') as Goal,
    accent: (r.accent || 'ember') as AccentKey,
    prs: r.prs ?? {},
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
  }
}

function fromProfile(p: Profile) {
  return {
    id: p.id,
    name: p.name,
    unit: p.unit,
    bodyweight: p.bodyweight,
    goal: p.goal,
    accent: p.accent,
    prs: p.prs,
    created_at: new Date(p.createdAt).toISOString(),
  }
}

interface LogRow {
  id: string
  profile_id: string
  day_stamp: string
  day_key: string
  exercise_id: string
  set_index: number
}

function toLog(r: LogRow): SetLog {
  return {
    id: r.id,
    profileId: r.profile_id,
    dayStamp: r.day_stamp,
    dayKey: r.day_key,
    exerciseId: r.exercise_id,
    setIndex: r.set_index,
  }
}

/** Marker ids are `profile|date|day|exercise|set` — parseable both ways. */
export function parseLogId(id: string): SetLog | null {
  const [profileId, dayStamp, dayKey, exerciseId, setIndex] = id.split('|')
  if (!profileId || !dayStamp || !dayKey || !exerciseId || setIndex === undefined) return null
  const n = Number.parseInt(setIndex, 10)
  if (Number.isNaN(n)) return null
  return { id, profileId, dayStamp, dayKey, exerciseId, setIndex: n }
}

/* ------------------------------------------------------------------ */
/*  Reads                                                              */
/* ------------------------------------------------------------------ */

/** Everything the app needs, for the given date's set logs. */
export async function pullSnapshot(dayStamp: string): Promise<Snapshot> {
  const [profilesRes, settingsRes, logsRes] = await Promise.all([
    request('profiles?select=*&order=created_at.asc', { headers: headers() }),
    request('app_settings?select=*&id=eq.shared', { headers: headers() }),
    request(`set_logs?select=*&day_stamp=eq.${encodeURIComponent(dayStamp)}`, { headers: headers() }),
  ])

  const profileRows = (await profilesRes.json()) as ProfileRow[]
  const settingRows = (await settingsRes.json()) as { week: number; wednesday: string }[]
  const logRows = (await logsRes.json()) as LogRow[]

  const s = settingRows[0]
  return {
    profiles: profileRows.map(toProfile),
    settings: {
      week: s?.week ?? 1,
      wednesday: s?.wednesday === 'arms' ? 'arms' : 'legs',
    },
    logs: logRows.map(toLog),
  }
}

/* ------------------------------------------------------------------ */
/*  Writes                                                             */
/* ------------------------------------------------------------------ */

const UPSERT = { Prefer: 'resolution=merge-duplicates,return=minimal' }

export async function pushProfiles(profiles: Profile[]): Promise<void> {
  if (!profiles.length) return
  await request('profiles', {
    method: 'POST',
    headers: headers(UPSERT),
    body: JSON.stringify(profiles.map(fromProfile)),
  })
}

export async function deleteProfile(id: string): Promise<void> {
  await request(`profiles?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers({ Prefer: 'return=minimal' }),
  })
}

export async function pushSettings(settings: SharedSettings): Promise<void> {
  await request('app_settings', {
    method: 'POST',
    headers: headers(UPSERT),
    body: JSON.stringify([{ id: 'shared', week: settings.week, wednesday: settings.wednesday }]),
  })
}

export async function addLog(id: string): Promise<void> {
  const log = parseLogId(id)
  if (!log) return
  await request('set_logs', {
    method: 'POST',
    headers: headers(UPSERT),
    body: JSON.stringify([
      {
        id: log.id,
        profile_id: log.profileId,
        day_stamp: log.dayStamp,
        day_key: log.dayKey,
        exercise_id: log.exerciseId,
        set_index: log.setIndex,
      },
    ]),
  })
}

export async function removeLog(id: string): Promise<void> {
  await request(`set_logs?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers({ Prefer: 'return=minimal' }),
  })
}

/** Clears one lifter's markers for one day — backs the "Reset day" button. */
export async function removeDayLogs(
  profileId: string,
  dayStamp: string,
  dayKey: string,
): Promise<void> {
  const q = [
    `profile_id=eq.${encodeURIComponent(profileId)}`,
    `day_stamp=eq.${encodeURIComponent(dayStamp)}`,
    `day_key=eq.${encodeURIComponent(dayKey)}`,
  ].join('&')
  await request(`set_logs?${q}`, { method: 'DELETE', headers: headers({ Prefer: 'return=minimal' }) })
}
