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

const KEY = 'iron.v1'

interface Persisted {
  profiles: Profile[]
  activeId: string
  week: number
  /** completed set markers: `${userId}|${dayKey}|${exId}|${setIndex}` */
  done: string[]
  /** which Wednesday variant is showing: legs or arms */
  wednesday: 'legs' | 'arms'
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

function makeProfile(name: string, accent: AccentKey, prs: Partial<Record<PRKey, number>> = {}, bodyweight = 165): Profile {
  return {
    id: uid(),
    name,
    unit: 'lb',
    bodyweight,
    goal: 'bulk',
    prs,
    accent,
    createdAt: Date.now(),
  }
}

/** Steven and Zach ship with the site. Everything is editable in User Management. */
function seed(): Persisted {
  const steven = makeProfile('Steven', 'ember', { bench: 185, squat: 225, deadlift: 275 }, 165)
  const zach = makeProfile('Zach', 'volt', { bench: 175, squat: 215, deadlift: 265 }, 160)
  return {
    profiles: [steven, zach],
    activeId: steven.id,
    week: 1,
    done: [],
    wednesday: 'legs',
  }
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw) as Partial<Persisted>
    if (!parsed.profiles?.length) return seed()
    return {
      profiles: parsed.profiles,
      activeId: parsed.activeId && parsed.profiles.some((p) => p.id === parsed.activeId)
        ? parsed.activeId
        : parsed.profiles[0].id,
      week: parsed.week ?? 1,
      done: parsed.done ?? [],
      wednesday: parsed.wednesday === 'arms' ? 'arms' : 'legs',
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
  setActive: (id: string) => void
  setWeek: (w: number) => void
  setWednesday: (v: 'legs' | 'arms') => void
  updateProfile: (id: string, patch: Partial<Profile>) => void
  setPR: (id: string, key: PRKey, value: number | undefined) => void
  addProfile: (name: string, accent: AccentKey) => void
  removeProfile: (id: string) => void
  setGoal: (goal: Goal) => void
  setUnit: (id: string, unit: Unit) => void
  isDone: (dayKey: string, exId: string, set: number) => boolean
  toggleDone: (dayKey: string, exId: string, set: number) => void
  clearDay: (dayKey: string) => void
  doneCount: (dayKey: string) => number
  exportJSON: () => string
  importJSON: (raw: string) => boolean
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(() => load())

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* private window / storage disabled — the app still works for this session */
    }
  }, [state])

  const profile = useMemo(
    () => state.profiles.find((p) => p.id === state.activeId) ?? state.profiles[0],
    [state.profiles, state.activeId],
  )

  const updateProfile = useCallback((id: string, patch: Partial<Profile>) => {
    setState((s) => ({
      ...s,
      profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }))
  }, [])

  const setPR = useCallback((id: string, key: PRKey, value: number | undefined) => {
    setState((s) => ({
      ...s,
      profiles: s.profiles.map((p) => {
        if (p.id !== id) return p
        const prs = { ...p.prs }
        if (value == null || Number.isNaN(value) || value <= 0) delete prs[key]
        else prs[key] = value
        return { ...p, prs }
      }),
    }))
  }, [])

  const markerPrefix = useCallback(
    (dayKey: string) => `${state.activeId}|${dayKey}|`,
    [state.activeId],
  )

  const store: Store = {
    profiles: state.profiles,
    profile,
    week: state.week,
    wednesday: state.wednesday,
    setActive: (id) => setState((s) => ({ ...s, activeId: id })),
    setWeek: (w) => setState((s) => ({ ...s, week: ((w - 1) % 4 + 4) % 4 + 1 })),
    setWednesday: (v) => setState((s) => ({ ...s, wednesday: v })),
    updateProfile,
    setPR,
    addProfile: (name, accent) =>
      setState((s) => {
        const p = makeProfile(name.trim() || 'New lifter', accent)
        return { ...s, profiles: [...s.profiles, p], activeId: p.id }
      }),
    removeProfile: (id) =>
      setState((s) => {
        if (s.profiles.length <= 1) return s
        const profiles = s.profiles.filter((p) => p.id !== id)
        return {
          ...s,
          profiles,
          activeId: s.activeId === id ? profiles[0].id : s.activeId,
          done: s.done.filter((d) => !d.startsWith(`${id}|`)),
        }
      }),
    setGoal: (goal) => updateProfile(state.activeId, { goal }),
    setUnit: (id, unit) => updateProfile(id, { unit }),
    isDone: (dayKey, exId, set) => state.done.includes(`${state.activeId}|${dayKey}|${exId}|${set}`),
    toggleDone: (dayKey, exId, set) =>
      setState((s) => {
        const k = `${s.activeId}|${dayKey}|${exId}|${set}`
        return { ...s, done: s.done.includes(k) ? s.done.filter((d) => d !== k) : [...s.done, k] }
      }),
    clearDay: (dayKey) =>
      setState((s) => ({ ...s, done: s.done.filter((d) => !d.startsWith(`${s.activeId}|${dayKey}|`)) })),
    doneCount: (dayKey) => state.done.filter((d) => d.startsWith(markerPrefix(dayKey))).length,
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON: (raw) => {
      try {
        const parsed = JSON.parse(raw) as Partial<Persisted>
        if (!Array.isArray(parsed.profiles) || !parsed.profiles.length) return false
        setState({
          profiles: parsed.profiles,
          activeId: parsed.activeId ?? parsed.profiles[0].id,
          week: parsed.week ?? 1,
          done: parsed.done ?? [],
          wednesday: parsed.wednesday === 'arms' ? 'arms' : 'legs',
        })
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

export const ACCENTS: Record<AccentKey, { name: string; from: string; to: string; ring: string; text: string }> = {
  ember: { name: 'Ember', from: '#ff6a2b', to: '#ff2d55', ring: '#ff6a2b', text: '#ffb08a' },
  volt: { name: 'Volt', from: '#c6ff2e', to: '#20e3a2', ring: '#a8f02b', text: '#d6ff86' },
  ice: { name: 'Ice', from: '#38bdf8', to: '#4f6bff', ring: '#38bdf8', text: '#9fd9ff' },
  violet: { name: 'Violet', from: '#a855f7', to: '#ec4899', ring: '#a855f7', text: '#dcb6ff' },
  lime: { name: 'Lime', from: '#84cc16', to: '#facc15', ring: '#a3e635', text: '#d9f99d' },
  rose: { name: 'Rose', from: '#fb7185', to: '#f97316', ring: '#fb7185', text: '#fecdd3' },
}
