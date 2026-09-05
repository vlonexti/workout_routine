import { cloudKey, cloudUrl, isCloudConfigured } from './cloud-config'
import type { AccentKey, Goal, PRKey, Profile, Unit } from './types'

/*
 * A small PostgREST client for Supabase, written against fetch directly.
 * The whole surface we need is two tables and upsert/delete, which is not
 * worth a 50 kB SDK — and doing it by hand keeps every failure path visible.
 */

export interface SharedSettings {
  week: number
  wednesday: 'legs' | 'arms'
}

export interface Snapshot {
  profiles: Profile[]
  settings: SharedSettings
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

/* ------------------------------------------------------------------ */
/*  Reads                                                              */
/* ------------------------------------------------------------------ */

export async function pullSnapshot(): Promise<Snapshot> {
  const [profilesRes, settingsRes] = await Promise.all([
    request('profiles?select=*&order=created_at.asc', { headers: headers() }),
    request('app_settings?select=*&id=eq.shared', { headers: headers() }),
  ])

  const profileRows = (await profilesRes.json()) as ProfileRow[]
  const settingRows = (await settingsRes.json()) as { week: number; wednesday: string }[]
  const s = settingRows[0]

  return {
    profiles: profileRows.map(toProfile),
    settings: {
      week: s?.week ?? 1,
      wednesday: s?.wednesday === 'arms' ? 'arms' : 'legs',
    },
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
