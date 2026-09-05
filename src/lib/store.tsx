import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AccentKey,
  BodyweightEntry,
  Goal,
  Lifter,
  PRKey,
  PREntry,
  SetLog,
  Unit,
  WednesdayVariant,
} from './types'
import * as db from './supabase'

/**
 * The only thing kept on the device is which lifter this browser had open
 * last. Everything else lives in Postgres.
 */
const ACTIVE_KEY = 'iron.activeLifter'
const MIGRATED_KEY = 'iron.migrated'
const LEGACY_KEYS = ['iron.v2', 'iron.v1']

export type LoadStatus = 'loading' | 'ready' | 'error' | 'unconfigured'
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface Data {
  lifters: Lifter[]
  prEntries: PREntry[]
  bodyweight: BodyweightEntry[]
  setLogs: SetLog[]
}

const EMPTY: Data = { lifters: [], prEntries: [], bodyweight: [], setLogs: [] }

interface Store {
  status: LoadStatus
  error: string | null
  saveState: SaveState
  saveError: string | null
  reload: () => void

  lifters: Lifter[]
  lifter: Lifter
  setActive: (id: string) => void

  updateLifter: (id: string, patch: Partial<Lifter>) => void
  addLifter: (name: string, accent: AccentKey) => void
  removeLifter: (id: string) => void
  setGoal: (goal: Goal) => void
  setUnit: (id: string, unit: Unit) => void
  setTrainingWeek: (week: number) => void
  setWednesday: (v: WednesdayVariant) => void

  setPR: (id: string, lift: PRKey, value: number | undefined) => void
  prHistory: (id: string, lift: PRKey) => PREntry[]
  /** Change vs the previous recorded value, or null when there is no history. */
  prDelta: (id: string, lift: PRKey) => number | null

  bodyweightHistory: (id: string) => BodyweightEntry[]

  isSetDone: (dayKey: string, exerciseId: string, setIndex: number) => boolean
  toggleSet: (
    dayKey: string,
    exerciseId: string,
    setIndex: number,
    weight: number | null,
    reps: number | null,
  ) => void
  clearDay: (dayKey: string) => void
  doneToday: (dayKey: string) => number
  /** Most recent completed session for an exercise, excluding today. */
  lastSession: (exerciseId: string) => { weight: number | null; reps: number | null; on: string } | null
}

const Ctx = createContext<Store | null>(null)

function readActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

function writeActive(id: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, id)
  } catch {
    /* private window — the selection just will not survive a reload */
  }
}

/**
 * One-time lift of the pre-database local data into Postgres. Only runs when
 * the database is completely empty, so it can never clobber real rows.
 */
async function migrateLegacyLocalData(): Promise<boolean> {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return false
    const raw = LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean)
    if (!raw) return false

    const parsed = JSON.parse(raw) as {
      profiles?: {
        name?: string
        unit?: string
        bodyweight?: number
        goal?: string
        accent?: string
        prs?: Record<string, number>
      }[]
      week?: number
      wednesday?: string
    }
    if (!parsed.profiles?.length) return false
    if (!(await db.isEmpty())) return false

    for (const [i, p] of parsed.profiles.entries()) {
      const lifter: Lifter = {
        id: db.newId(),
        name: p.name?.trim() || `Lifter ${i + 1}`,
        accent: (p.accent as AccentKey) ?? 'ember',
        unit: p.unit === 'kg' ? 'kg' : 'lb',
        bodyweight: p.bodyweight && p.bodyweight > 0 ? p.bodyweight : 165,
        goal: p.goal === 'cut' ? 'cut' : 'bulk',
        trainingWeek: parsed.week ?? 1,
        wednesday: parsed.wednesday === 'arms' ? 'arms' : 'legs',
        targets: { kcal: null, protein: null, carbs: null, fat: null },
        sortOrder: i,
        prs: {},
        createdAt: Date.now(),
      }
      await db.insertLifter(lifter)

      for (const [lift, value] of Object.entries(p.prs ?? {})) {
        if (typeof value === 'number' && value > 0) {
          await db.insertPR({
            id: db.newId(),
            lifterId: lifter.id,
            lift: lift as PRKey,
            value,
            unit: lifter.unit,
            recordedAt: Date.now(),
          })
        }
      }
      await db.upsertBodyweight({
        id: db.newId(),
        lifterId: lifter.id,
        weight: lifter.bodyweight,
        unit: lifter.unit,
        loggedOn: db.today(),
      })
    }
    localStorage.setItem(MIGRATED_KEY, new Date().toISOString())
    return true
  } catch {
    // A failed import must never block the app; the rows are still on the
    // device and the next load will try again.
    return false
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(EMPTY)
  const [status, setStatus] = useState<LoadStatus>(db.configured ? 'loading' : 'unconfigured')
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(() => readActive())

  const dataRef = useRef(data)
  dataRef.current = data
  const inflight = useRef(0)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ---------------- loading ---------------- */

  const load = useCallback(async () => {
    if (!db.configured) {
      setStatus('unconfigured')
      return
    }
    setStatus('loading')
    setError(null)
    try {
      await migrateLegacyLocalData()
      const snap = await db.loadAll()
      setData(snap)
      setStatus('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Pick up another device's edits when the tab comes back to the front.
  useEffect(() => {
    if (!db.configured) return
    const onFocus = () => {
      if (document.visibilityState === 'hidden') return
      void db
        .loadAll()
        .then(setData)
        .catch(() => {
          /* a background refresh failing is not worth interrupting anyone */
        })
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  /* ---------------- optimistic write helper ---------------- */

  const mutate = useCallback((next: (d: Data) => Data, persist: () => Promise<void>) => {
    const rollback = dataRef.current
    setData(next)

    inflight.current += 1
    setSaveState('saving')
    setSaveError(null)

    void persist()
      .then(() => {
        inflight.current -= 1
        if (inflight.current === 0) {
          setSaveState('saved')
          if (savedTimer.current) clearTimeout(savedTimer.current)
          savedTimer.current = setTimeout(() => setSaveState('idle'), 1600)
        }
      })
      .catch((e: unknown) => {
        inflight.current = Math.max(0, inflight.current - 1)
        // Put the UI back to the last state the database agreed with, so a
        // failed write never looks like it succeeded.
        setData(rollback)
        setSaveState('error')
        setSaveError(e instanceof Error ? e.message : String(e))
      })
  }, [])

  /* ---------------- derived ---------------- */

  const lifters = data.lifters
  const lifter = useMemo<Lifter>(
    () => lifters.find((l) => l.id === activeId) ?? lifters[0],
    [lifters, activeId],
  )

  // Keep the remembered selection pointing at somebody who still exists.
  useEffect(() => {
    if (lifter && lifter.id !== activeId) {
      setActiveId(lifter.id)
      writeActive(lifter.id)
    }
  }, [lifter, activeId])

  const applyPRs = useCallback((d: Data, lifterId: string): Data => {
    const entries = d.prEntries.filter((e) => e.lifterId === lifterId)
    const prs = db.currentPRs(entries)
    return { ...d, lifters: d.lifters.map((l) => (l.id === lifterId ? { ...l, prs } : l)) }
  }, [])

  const store: Store = {
    status,
    error,
    saveState,
    saveError,
    reload: () => void load(),

    lifters,
    lifter,

    setActive: (id) => {
      setActiveId(id)
      writeActive(id)
    },

    updateLifter: (id, patch) => {
      const bodyweightChanged =
        patch.bodyweight !== undefined &&
        patch.bodyweight !== lifters.find((l) => l.id === id)?.bodyweight
      const bwEntry: BodyweightEntry | null = bodyweightChanged
        ? {
            id: db.newId(),
            lifterId: id,
            weight: patch.bodyweight!,
            unit: patch.unit ?? lifters.find((l) => l.id === id)?.unit ?? 'lb',
            loggedOn: db.today(),
          }
        : null

      mutate(
        (d) => ({
          ...d,
          lifters: d.lifters.map((l) => (l.id === id ? { ...l, ...patch } : l)),
          bodyweight: bwEntry
            ? [...d.bodyweight.filter((b) => !(b.lifterId === id && b.loggedOn === bwEntry.loggedOn)), bwEntry]
            : d.bodyweight,
        }),
        async () => {
          await db.updateLifter(id, patch)
          if (bwEntry) await db.upsertBodyweight(bwEntry)
        },
      )
    },

    addLifter: (name, accent) => {
      const lifterRow: Lifter = {
        id: db.newId(),
        name: name.trim() || 'New lifter',
        accent,
        unit: lifter?.unit ?? 'lb',
        bodyweight: 165,
        goal: 'bulk',
        trainingWeek: 1,
        wednesday: 'legs',
        targets: { kcal: null, protein: null, carbs: null, fat: null },
        sortOrder: lifters.length,
        prs: {},
        createdAt: Date.now(),
      }
      setActiveId(lifterRow.id)
      writeActive(lifterRow.id)
      mutate(
        (d) => ({ ...d, lifters: [...d.lifters, lifterRow] }),
        () => db.insertLifter(lifterRow),
      )
    },

    removeLifter: (id) => {
      if (lifters.length <= 1) return
      const remaining = lifters.filter((l) => l.id !== id)
      if (activeId === id) {
        setActiveId(remaining[0].id)
        writeActive(remaining[0].id)
      }
      mutate(
        (d) => ({
          lifters: d.lifters.filter((l) => l.id !== id),
          prEntries: d.prEntries.filter((e) => e.lifterId !== id),
          bodyweight: d.bodyweight.filter((b) => b.lifterId !== id),
          setLogs: d.setLogs.filter((s) => s.lifterId !== id),
        }),
        () => db.deleteLifter(id),
      )
    },

    setGoal: (goal) => store.updateLifter(lifter.id, { goal }),
    setUnit: (id, unit) => store.updateLifter(id, { unit }),
    setTrainingWeek: (week) => {
      const w = ((((week - 1) % 4) + 4) % 4) + 1
      store.updateLifter(lifter.id, { trainingWeek: w })
    },
    setWednesday: (wednesday) => store.updateLifter(lifter.id, { wednesday }),

    setPR: (id, lift, value) => {
      const owner = lifters.find((l) => l.id === id)
      if (!owner) return
      if (value == null || Number.isNaN(value) || value <= 0) {
        mutate(
          (d) => applyPRs({ ...d, prEntries: d.prEntries.filter((e) => !(e.lifterId === id && e.lift === lift)) }, id),
          () => db.deletePRLift(id, lift),
        )
        return
      }
      if (owner.prs[lift] === value) return
      const entry: PREntry = {
        id: db.newId(),
        lifterId: id,
        lift,
        value,
        unit: owner.unit,
        recordedAt: Date.now(),
      }
      mutate(
        (d) => applyPRs({ ...d, prEntries: [...d.prEntries, entry] }, id),
        () => db.insertPR(entry),
      )
    },

    prHistory: (id, lift) =>
      data.prEntries
        .filter((e) => e.lifterId === id && e.lift === lift)
        .sort((a, b) => a.recordedAt - b.recordedAt),

    prDelta: (id, lift) => {
      const h = data.prEntries
        .filter((e) => e.lifterId === id && e.lift === lift)
        .sort((a, b) => a.recordedAt - b.recordedAt)
      if (h.length < 2) return null
      return Math.round((h[h.length - 1].value - h[h.length - 2].value) * 10) / 10
    },

    bodyweightHistory: (id) =>
      data.bodyweight.filter((b) => b.lifterId === id).sort((a, b) => a.loggedOn.localeCompare(b.loggedOn)),

    isSetDone: (dayKey, exerciseId, setIndex) =>
      data.setLogs.some(
        (s) =>
          s.lifterId === lifter?.id &&
          s.performedOn === db.today() &&
          s.dayKey === dayKey &&
          s.exerciseId === exerciseId &&
          s.setIndex === setIndex,
      ),

    toggleSet: (dayKey, exerciseId, setIndex, weight, reps) => {
      const on = db.today()
      const existing = data.setLogs.find(
        (s) =>
          s.lifterId === lifter.id &&
          s.performedOn === on &&
          s.dayKey === dayKey &&
          s.exerciseId === exerciseId &&
          s.setIndex === setIndex,
      )
      if (existing) {
        mutate(
          (d) => ({ ...d, setLogs: d.setLogs.filter((s) => s.id !== existing.id) }),
          () => db.deleteSetLog(existing.id),
        )
        return
      }
      const log: SetLog = {
        id: db.newId(),
        lifterId: lifter.id,
        performedOn: on,
        dayKey,
        exerciseId,
        setIndex,
        weight,
        reps,
        trainingWeek: lifter.trainingWeek,
      }
      mutate(
        (d) => ({ ...d, setLogs: [log, ...d.setLogs] }),
        () => db.upsertSetLog(log),
      )
    },

    clearDay: (dayKey) => {
      const on = db.today()
      mutate(
        (d) => ({
          ...d,
          setLogs: d.setLogs.filter(
            (s) => !(s.lifterId === lifter.id && s.performedOn === on && s.dayKey === dayKey),
          ),
        }),
        () => db.deleteDayLogs(lifter.id, on, dayKey),
      )
    },

    doneToday: (dayKey) =>
      data.setLogs.filter(
        (s) => s.lifterId === lifter?.id && s.performedOn === db.today() && s.dayKey === dayKey,
      ).length,

    lastSession: (exerciseId) => {
      const on = db.today()
      const prior = data.setLogs
        .filter((s) => s.lifterId === lifter?.id && s.exerciseId === exerciseId && s.performedOn < on)
        .sort((a, b) => b.performedOn.localeCompare(a.performedOn))
      if (!prior.length) return null
      const day = prior[0].performedOn
      const sets = prior.filter((s) => s.performedOn === day)
      // Report the heaviest set of that session — the number worth beating.
      const best = sets.reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a))
      return { weight: best.weight, reps: best.reps, on: day }
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
 * One flat colour per lifter. Used to identify whose data is on screen —
 * a dot, an initial, a thin edge — never to repaint the whole page.
 */
export const ACCENTS: Record<AccentKey, { name: string; base: string; soft: string; line: string }> = {
  ember: { name: 'Crimson', base: '#b23132', soft: '#fbeeee', line: '#eec9c9' },
  ice: { name: 'Blue', base: '#2a5fb0', soft: '#edf2fb', line: '#c6d6ef' },
  volt: { name: 'Green', base: '#2f7d4f', soft: '#eef6f1', line: '#c6e0d0' },
  violet: { name: 'Violet', base: '#6b4bab', soft: '#f2effa', line: '#d4cbee' },
  lime: { name: 'Amber', base: '#96702a', soft: '#faf4e9', line: '#e6d5b3' },
  rose: { name: 'Rose', base: '#a83a5c', soft: '#fbeef2', line: '#eec9d5' },
}
