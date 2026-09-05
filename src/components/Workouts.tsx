import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DAYS } from '../data/program'
import { useStore } from '../lib/store'
import type { Day, Exercise } from '../lib/types'
import {
  WEEKS,
  computeLoad,
  exerciseSets,
  fmtClock,
  fmtMinutes,
  plateBreakdown,
  sessionMinutes,
  weekSpec,
} from '../lib/calc'
import { Button, Pill, SectionTitle } from './ui'

/* ------------------------------------------------------------------ */
/*  Rest timer                                                         */
/* ------------------------------------------------------------------ */

interface TimerState {
  label: string
  total: number
  left: number
}

function useRestTimer() {
  const [timer, setTimer] = useState<TimerState | null>(null)
  const audioRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!timer) return
    if (timer.left <= 0) {
      beep()
      const t = setTimeout(() => setTimer(null), 2500)
      return () => clearTimeout(t)
    }
    const id = setInterval(() => setTimer((t) => (t ? { ...t, left: t.left - 1 } : t)), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer?.left, timer?.label])

  function beep() {
    try {
      audioRef.current ??= new AudioContext()
      const ctx = audioRef.current
      if (ctx.state === 'suspended') void ctx.resume()
      ;[0, 0.22, 0.44].forEach((offset) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset)
        gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + offset + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.16)
        osc.connect(gain).connect(ctx.destination)
        osc.start(ctx.currentTime + offset)
        osc.stop(ctx.currentTime + offset + 0.18)
      })
      if ('vibrate' in navigator) navigator.vibrate?.([120, 60, 120])
    } catch {
      /* audio blocked — the visible countdown still works */
    }
  }

  return {
    timer,
    start: (label: string, seconds: number) => {
      // Touching the AudioContext inside the click gesture unlocks sound on iOS.
      try {
        audioRef.current ??= new AudioContext()
        void audioRef.current.resume()
      } catch {
        /* ignore */
      }
      setTimer({ label, total: seconds, left: seconds })
    },
    stop: () => setTimer(null),
    add: (s: number) => setTimer((t) => (t ? { ...t, left: t.left + s, total: t.total + s } : t)),
  }
}

function RestBar({
  timer,
  onStop,
  onAdd,
}: {
  timer: TimerState
  onStop: () => void
  onAdd: (s: number) => void
}) {
  const pct = Math.max(0, Math.min(100, (timer.left / Math.max(1, timer.total)) * 100))
  const done = timer.left <= 0
  // Portalled to <body> so no ancestor transform can capture the fixed position.
  return createPortal(
    <div className="fixed inset-x-0 bottom-[68px] z-50 px-3 md:bottom-5">
      <div className="mx-auto max-w-md overflow-hidden rounded-xl border border-line bg-white shadow-lg shadow-black/[0.08]">
        <div className="h-0.5 w-full bg-line">
          <div
            className="h-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${done ? 100 : pct}%`, background: done ? '#16a34a' : 'var(--accent)' }}
          />
        </div>
        <div className="flex items-center gap-3 p-2.5">
          <div
            className="num grid w-[68px] shrink-0 place-items-center rounded-lg py-1.5 text-lg font-semibold"
            style={
              done
                ? { background: '#ecfdf3', color: '#15803d' }
                : { background: 'var(--accent-soft)', color: 'var(--accent)' }
            }
          >
            {done ? 'Go' : fmtClock(timer.left)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-ink-900">{timer.label}</div>
            <div className="text-[11px] text-ink-500">
              {done ? 'Rest is over.' : 'Resting — talk, then get back under it.'}
            </div>
          </div>
          {!done && (
            <Button size="sm" variant="outline" onClick={() => onAdd(30)} title="Add 30 seconds">
              +30s
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onStop}>
            {done ? 'Done' : 'Skip'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ------------------------------------------------------------------ */
/*  Exercise row                                                       */
/* ------------------------------------------------------------------ */

const TAG_STYLE: Record<string, string> = {
  main: 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]',
  secondary: 'border-line bg-paper text-ink-700',
  accessory: 'border-line bg-paper text-ink-500',
  finisher: 'border-amber-200 bg-amber-50 text-amber-700',
  core: 'border-sky-200 bg-sky-50 text-sky-700',
}

function ExerciseCard({
  ex,
  index,
  dayKey,
  onRest,
}: {
  ex: Exercise
  index: number
  dayKey: string
  onRest: (label: string, seconds: number) => void
}) {
  const { profile, week, isDone, toggleDone } = useStore()
  const [open, setOpen] = useState(false)
  const load = computeLoad(profile, ex, week)
  const sets = exerciseSets(ex, week)
  const plates =
    load.pct != null &&
    !ex.perHand &&
    !ex.bodyweightBased &&
    (ex.equip === 'Barbell' || ex.equip === 'EZ Bar')
      ? plateBreakdown(load.weight, profile.unit)
      : null

  const completed = Array.from({ length: sets }, (_, i) => isDone(dayKey, ex.id, i))
  const allDone = completed.every(Boolean)

  return (
    <article className={`card overflow-hidden ${allDone ? 'opacity-60' : ''}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="num mt-0.5 hidden w-6 shrink-0 text-sm font-medium text-ink-300 sm:block">
            {index + 1}
          </span>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded border px-1.5 py-px text-[10px] font-semibold capitalize ${TAG_STYLE[ex.tag]}`}
              >
                {ex.tag}
              </span>
              <span className="rounded border border-line bg-paper px-1.5 py-px text-[10px] font-medium text-ink-500">
                {ex.equip}
              </span>
              {ex.rpe && <span className="text-[11px] text-ink-400">{ex.rpe}</span>}
            </div>

            <h3 className="text-[15px] font-semibold leading-tight text-ink-900">{ex.name}</h3>

            <div className="num mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-500">
              <span className="font-semibold text-ink-700">
                {sets} × {ex.reps}
              </span>
              <span className="text-line-strong">·</span>
              <span>rest {fmtClock(ex.rest)}</span>
            </div>
          </div>

          {/* The number you put on the bar */}
          <div className="w-[132px] shrink-0 text-right sm:w-[168px]">
            <div className="num text-lg font-semibold leading-tight text-ink-900 sm:text-xl">
              {load.display}
            </div>
            {load.basis && (
              <div className="mt-1 text-[11px] leading-snug text-ink-400">
                {load.basis}
                {load.estimated && <span className="text-amber-600"> · estimated</span>}
              </div>
            )}
            {plates && <div className="num mt-0.5 text-[11px] text-ink-300">{plates}</div>}
            {load.pct == null && ex.loadNote && (
              <div className="mt-1 text-[11px] leading-snug text-ink-400">{ex.loadNote}</div>
            )}
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {completed.map((isSetDone, i) => (
            <button
              key={i}
              onClick={() => {
                toggleDone(dayKey, ex.id, i)
                if (!isSetDone && i < sets - 1) onRest(`${ex.name} — set ${i + 2} of ${sets}`, ex.rest)
              }}
              title={isSetDone ? `Undo set ${i + 1}` : `Complete set ${i + 1} and start the rest timer`}
              className="focus-ring num grid size-8 place-items-center rounded-md border text-xs font-semibold transition-colors"
              style={
                isSetDone
                  ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' }
                  : undefined
              }
            >
              <span className={isSetDone ? '' : 'text-ink-400'}>{isSetDone ? '✓' : i + 1}</span>
            </button>
          ))}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="focus-ring ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold text-ink-500 transition-colors hover:bg-paper hover:text-ink-900"
          >
            How to
            <svg
              viewBox="0 0 24 24"
              className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-line bg-paper p-4">
          <Detail label="Form">{ex.cue}</Detail>
          {ex.why && <Detail label="Why it's here">{ex.why}</Detail>}
          {ex.loadNote && load.pct != null && <Detail label="Loading">{ex.loadNote}</Detail>}
        </div>
      )}
    </article>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[96px_1fr] sm:gap-4">
      <div className="label">{label}</div>
      <p className="text-sm leading-relaxed text-ink-700">{children}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function RestDay({ day }: { day: Day }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line p-5 sm:p-6">
        <h2 className="h-display text-2xl text-ink-900">{day.title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-500">{day.blurb}</p>
      </div>
      <ul className="divide-y divide-line">
        {day.finisher.map((f, i) => (
          <li key={i} className="flex gap-3 p-4">
            <span className="num shrink-0 text-xs font-medium text-ink-300">{i + 1}</span>
            <span className="text-sm leading-relaxed text-ink-700">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function todayKey(wednesday: 'legs' | 'arms'): string {
  const map: Record<number, string> = {
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: wednesday === 'arms' ? 'wed-arms' : 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
  }
  return map[new Date().getDay()] ?? 'mon'
}

export default function Workouts() {
  const { profile, week, setWeek, wednesday, setWednesday, doneCount, clearDay } = useStore()
  const [selected, setSelected] = useState(() => todayKey(wednesday))
  const rest = useRestTimer()

  useEffect(() => {
    setSelected((s) =>
      s === 'wed' || s === 'wed-arms' ? (wednesday === 'arms' ? 'wed-arms' : 'wed') : s,
    )
  }, [wednesday])

  const rail = useMemo(
    () => DAYS.filter((d) => (wednesday === 'arms' ? d.key !== 'wed' : d.key !== 'wed-arms')),
    [wednesday],
  )
  const day = DAYS.find((d) => d.key === selected) ?? DAYS[0]
  const spec = weekSpec(week)

  const minutes = day.rest ? 0 : sessionMinutes(day.warmup, day.exercises, week)
  const totalSets = day.exercises.reduce((a, e) => a + exerciseSets(e, week), 0)
  const done = doneCount(day.key)
  const progress = totalSets ? Math.round((Math.min(done, totalSets) / totalSets) * 100) : 0
  const isToday = day.key === todayKey(wednesday)

  return (
    <div className="enter">
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Pill tone="accent">{profile.name}</Pill>
            <Pill tone="muted">
              Week {spec.week} · {spec.name}
            </Pill>
          </div>
          <h1 className="h-display text-3xl text-ink-900 sm:text-4xl">Five days a week.</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-500">
            Every weight below is worked out from your PRs. Keep those honest and the program runs
            itself.
          </p>
        </div>

        <div>
          <div className="label mb-1.5">Training week</div>
          <div className="inline-flex rounded-lg border border-line bg-paper p-0.5">
            {WEEKS.map((w) => (
              <button
                key={w.week}
                onClick={() => setWeek(w.week)}
                title={`${w.name} — ${w.note}`}
                className={`focus-ring num rounded-[0.3125rem] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  w.week === spec.week
                    ? 'bg-white text-ink-900 shadow-[0_1px_2px_rgba(24,24,27,0.06)]'
                    : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="card mb-5 flex items-start gap-2.5 p-3.5">
        <span
          className="num mt-px shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          {spec.label}
        </span>
        <p className="text-sm leading-relaxed text-ink-700">
          <span className="font-semibold text-ink-900">{spec.name}.</span> {spec.note}
        </p>
      </div>

      {/* Day rail */}
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {rail.map((d) => {
          const active = d.key === selected
          const dayIsToday = d.key === todayKey(wednesday)
          return (
            <button
              key={d.key}
              onClick={() => setSelected(d.key)}
              className={`focus-ring min-w-[104px] flex-1 shrink-0 rounded-lg border p-2.5 text-left transition-colors sm:min-w-0 ${
                active
                  ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
                  : 'border-line bg-white hover:border-line-strong'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  {d.short}
                </span>
                {dayIsToday && (
                  <span className="size-1 rounded-full" style={{ background: 'var(--accent)' }} />
                )}
              </div>
              <div
                className={`mt-0.5 text-[13px] font-semibold leading-tight ${
                  active ? 'text-[var(--accent)]' : 'text-ink-700'
                }`}
              >
                {d.title.replace(' — ', ' ')}
              </div>
            </button>
          )
        })}
      </div>

      {/* Day header */}
      <section className="card mb-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="label">{day.weekday}</span>
              {isToday && <Pill tone="accent">Today</Pill>}
            </div>
            <h2 className="h-display text-2xl text-ink-900">{day.title}</h2>
            <p className="mt-1 text-xs font-medium text-ink-500">{day.focus}</p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-700">{day.blurb}</p>
          </div>

          {day.alt && (
            <div>
              <div className="label mb-1.5">Wednesday is</div>
              <div className="inline-flex rounded-lg border border-line bg-paper p-0.5">
                {(['legs', 'arms'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setWednesday(v)}
                    className={`focus-ring rounded-[0.3125rem] px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                      wednesday === v
                        ? 'bg-white text-ink-900 shadow-[0_1px_2px_rgba(24,24,27,0.06)]'
                        : 'text-ink-500 hover:text-ink-900'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 max-w-[168px] text-[11px] leading-snug text-ink-400">
                Alternate week to week — legs one week, arms the next.
              </p>
            </div>
          )}
        </div>

        {!day.rest && (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <MiniStat label="Time" value={fmtMinutes(minutes)} />
              <MiniStat label="Exercises" value={String(day.exercises.length)} />
              <MiniStat label="Work sets" value={String(totalSets)} />
              <MiniStat label="Done today" value={`${progress}%`} accent={progress > 0} />
            </div>
            <div className="mt-3.5 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${progress}%`, background: 'var(--accent)' }}
                />
              </div>
              {done > 0 && (
                <Button size="sm" variant="outline" onClick={() => clearDay(day.key)}>
                  Reset
                </Button>
              )}
            </div>
          </>
        )}
      </section>

      {day.rest ? (
        <RestDay day={day} />
      ) : (
        <>
          <section className="mb-8">
            <SectionTitle
              kicker={`${day.warmup.reduce((a, b) => a + b.minutes, 0)} minutes`}
              title="Warm-up"
              sub="Do not rush it. Warm-up sets never count toward your work sets."
            />
            <div className="grid gap-2.5 sm:grid-cols-2">
              {day.warmup.map((w, i) => (
                <div key={i} className="card flex gap-3 p-3.5">
                  <span className="num shrink-0 text-xs font-medium text-ink-300">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-sm font-semibold text-ink-900">{w.name}</h4>
                      <span className="num text-[11px] text-ink-400">{w.minutes}m</span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{w.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <SectionTitle
              kicker={`${totalSets} work sets`}
              title="The session"
              sub="Tap a set when you finish it and the rest timer starts on its own."
            />
            <div className="space-y-2.5">
              {day.exercises.map((ex, i) => (
                <ExerciseCard key={ex.id} ex={ex} index={i} dayKey={day.key} onRest={rest.start} />
              ))}
            </div>
          </section>

          <section>
            <SectionTitle kicker="Before you leave" title="Cool-down" />
            <div className="card divide-y divide-line">
              {day.finisher.map((f, i) => (
                <div key={i} className="flex gap-3 p-4">
                  <span
                    className="mt-1.5 size-1 shrink-0 rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                  <span className="text-sm leading-relaxed text-ink-700">{f}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {rest.timer && <RestBar timer={rest.timer} onStop={rest.stop} onAdd={rest.add} />}
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="panel p-2.5">
      <div className="label">{label}</div>
      <div
        className="num mt-0.5 text-base font-semibold"
        style={{ color: accent ? 'var(--accent)' : 'var(--color-ink-900)' }}
      >
        {value}
      </div>
    </div>
  )
}
