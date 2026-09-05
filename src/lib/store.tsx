import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AccentKey, Goal, PRKey, Profile, Unit } from './types'
import * as cloud from './cloud'

const KEY = 'iron.v2'

interface Persisted {
  profiles: Profile[]
  /** Who is using THIS device. Deliberately not shared. */
  activeId: string
  week: number
  wednesday: 'legs' | 'arms'
}

export type SyncStatus = 'local' | 'connecting' | 'synced' | 'offline'

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

function makeProfile(
  name: string,
  accent: AccentKey,
  prs: Partial<Record<PRKey, number>> = {},
  bodyweight = 165,
  id = uid(),
): Profile {
  return { id, name, unit: 'lb', bodyweight, goal: 'bulk', prs, accent, createdAt: Date.now() }
}

/** Steven and Zach ship with the site; everything is editable in-app. */
function seed(): Persisted {
  const steven = makeProfile('Steven', 'ember', { bench: 185, squat: 225, deadlift: 275 }, 165, 'steven')
  const zach = makeProfile('Zach', 'ice', { bench: 175, squat: 215, deadlift: 265 }, 160, 'zach')
  return { profiles: [steven, zach], activeId: steven.id, week: 1, wednesday: 'legs' }
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed()
    const p = JSON.parse(raw) as Partial<Persisted>
    if (!p.profiles?.length) return seed()
    return {
      profiles: p.profiles,
      activeId:
        p.activeId && p.profiles.some((x) => x.id === p.activeId) ? p.activeId : p.profiles[0].id,
      week: p.week ?? 1,
      wednesday: p.wednesday === 'arms' ? 'arms' : 'legs',
    }
  } catch {
    return seed()
  }
}

interface Store {
  profiles: Profile[]
  profile: Profile
  week: number
  wednesday: 'legs' | 'arms'
  sync: SyncStatus
  syncError: string | null
  cloudEnabled: boolean
  refresh: () => void
  setActive: (id: string) => void
  setWeek: (w: number) => void
  setWednesday: (v: 'legs' | 'arms') => void
  updateProfile: (id: string, patch: Partial<Profile>) => void
  setPR: (id: string, key: PRKey, value: number | undefined) => void
  addProfile: (name: string, accent: AccentKey) => void
  removeProfile: (id: string) => void
  setGoal: (goal: Goal) => void
  setUnit: (id: string, unit: Unit) => void
  exportJSON: () => string
  importJSON: (raw: string) => boolean
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(() => load())
  const [sync, setSync] = useState<SyncStatus>(cloud.cloudEnabled ? 'connecting' : 'local')
  const [syncError, setSyncError] = useState<string | null>(null)

  /* --- cache locally on every change, so reloads and offline both work --- */
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* private window or storage full — the session still works in memory */
    }
  }, [state])

  // Writes are fire-and-forget: the local state already moved, so a failure
  // downgrades the badge rather than blocking or reverting the UI.
  const push = useCallback((run: () => Promise<unknown>) => {
    if (!cloud.cloudEnabled) return
    void run()
      .then(() => {
        setSync('synced')
        setSyncError(null)
      })
      .catch((e: unknown) => {
        setSync('offline')
        setSyncError(e instanceof Error ? e.message : String(e))
      })
  }, [])

  const pull = useCallback(async () => {
    if (!cloud.cloudEnabled) return
    try {
      const snap = await cloud.pullSnapshot()
      setState((s) => {
        const profiles = snap.profiles.length ? snap.profiles : s.profiles
        return {
          profiles,
          activeId: profiles.some((p) => p.id === s.activeId) ? s.activeId : profiles[0].id,
          week: snap.settings.week,
          wednesday: snap.settings.wednesday,
        }
      })
      setSync('synced')
      setSyncError(null)
    } catch (e) {
      setSync('offline')
      setSyncError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  /* --- initial pull, then refresh on focus and on a slow timer ---------- */
  useEffect(() => {
    if (!cloud.cloudEnabled) return
    void pull()
    const onFocus = () => void pull()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    const id = setInterval(onFocus, 60_000)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      clearInterval(id)
    }
  }, [pull])

  const profile = useMemo(
    () => state.profiles.find((p) => p.id === state.activeId) ?? state.profiles[0],
    [state.profiles, state.activeId],
  )

  const updateProfile = useCallback(
    (id: string, patch: Partial<Profile>) => {
      setState((s) => {
        const profiles = s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p))
        const changed = profiles.find((p) => p.id === id)
        if (changed) push(() => cloud.pushProfiles([changed]))
        return { ...s, profiles }
      })
    },
    [push],
  )

  const setPR = useCallback(
    (id: string, key: PRKey, value: number | undefined) => {
      setState((s) => {
        const profiles = s.profiles.map((p) => {
          if (p.id !== id) return p
          const prs = { ...p.prs }
          if (value == null || Number.isNaN(value) || value <= 0) delete prs[key]
          else prs[key] = value
          return { ...p, prs }
        })
        const changed = profiles.find((p) => p.id === id)
        if (changed) push(() => cloud.pushProfiles([changed]))
        return { ...s, profiles }
      })
    },
    [push],
  )

  const store: Store = {
    profiles: state.profiles,
    profile,
    week: state.week,
    wednesday: state.wednesday,
    sync,
    syncError,
    cloudEnabled: cloud.cloudEnabled,

    refresh: () => {
      setSync('connecting')
      void pull()
    },

    setActive: (id) => setState((s) => ({ ...s, activeId: id })),

    setWeek: (w) => {
      const week = ((((w - 1) % 4) + 4) % 4) + 1
      setState((s) => {
        push(() => cloud.pushSettings({ week, wednesday: s.wednesday }))
        return { ...s, week }
      })
    },

    setWednesday: (wednesday) =>
      setState((s) => {
        push(() => cloud.pushSettings({ week: s.week, wednesday }))
        return { ...s, wednesday }
      }),

    updateProfile,
    setPR,

    addProfile: (name, accent) =>
      setState((s) => {
        const p = makeProfile(name.trim() || 'New lifter', accent)
        push(() => cloud.pushProfiles([p]))
        return { ...s, profiles: [...s.profiles, p], activeId: p.id }
      }),

    removeProfile: (id) =>
      setState((s) => {
        if (s.profiles.length <= 1) return s
        const profiles = s.profiles.filter((p) => p.id !== id)
        push(() => cloud.deleteProfile(id))
        return {
          ...s,
          profiles,
          activeId: s.activeId === id ? profiles[0].id : s.activeId,
        }
      }),

    setGoal: (goal) => updateProfile(state.activeId, { goal }),
    setUnit: (id, unit) => updateProfile(id, { unit }),

    exportJSON: () => JSON.stringify(state, null, 2),

    importJSON: (raw) => {
      try {
        const p = JSON.parse(raw) as Partial<Persisted>
        if (!Array.isArray(p.profiles) || !p.profiles.length) return false
        const next: Persisted = {
          profiles: p.profiles,
          activeId: p.activeId ?? p.profiles[0].id,
          week: p.week ?? 1,
          wednesday: p.wednesday === 'arms' ? 'arms' : 'legs',
        }
        setState(next)
        push(() => cloud.pushProfiles(next.profiles))
        return true
      } catch {
        return false
      }
    },
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used inside <StoreProvider>')
  return v
}

/**
 * One flat colour per lifter plus the two tints derived from it. Muted on
 * purpose — these sit on white and mark state, they are not decoration.
 */
export const ACCENTS: Record<AccentKey, { name: string; base: string; soft: string; line: string }> = {
  ember: { name: 'Rust', base: '#c2410c', soft: '#fdf1ea', line: '#f0cfba' },
  ice: { name: 'Blue', base: '#1d4ed8', soft: '#eef2fe', line: '#c4d2f7' },
  volt: { name: 'Green', base: '#15803d', soft: '#eef7f1', line: '#bfdfcb' },
  violet: { name: 'Violet', base: '#6d28d9', soft: '#f4f0fe', line: '#d5c6f6' },
  lime: { name: 'Gold', base: '#a16207', soft: '#fbf5e8', line: '#e8d5a8' },
  rose: { name: 'Rose', base: '#be123c', soft: '#fdeef2', line: '#f2c3ce' },
}
