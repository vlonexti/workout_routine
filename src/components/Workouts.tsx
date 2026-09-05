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
    const id = setInterval(() => {
      setTimer((t) => (t ? { ...t, left: t.left - 1 } : t))
    }, 1000)
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
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.16)
        osc.connect(gain).connect(ctx.destination)
        osc.start(ctx.currentTime + offset)
        osc.stop(ctx.currentTime + offset + 0.18)
      })
      if ('vibrate' in navigator) navigator.vibrate?.([120, 60, 120])
    } catch {
      /* audio blocked — the visual countdown still works */
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
  // Portalled to <body>: the page-entry animation leaves an identity transform on
  // its container, which would otherwise make `fixed` resolve against that box.
  return createPortal(
    <div className="fixed inset-x-0 bottom-[68px] z-50 px-3 md:bottom-5">
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-ink-850/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="h-1 w-full bg-white/[0.07]">
          <div
            className={`h-full transition-[width] duration-1000 ease-linear ${done ? 'bg-emerald-400' : 'accent-grad'}`}
            style={{ width: `${done ? 100 : pct}%` }}
          />
        </div>
        <div className="flex items-center gap-3 p-3">
          <div
            className={`num grid w-[74px] shrink-0 place-items-center rounded-xl py-1.5 text-xl font-bold ${
              done ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.07] text-ink-100'
            }`}
          >
            {done ? 'GO' : fmtClock(timer.left)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-ink-100">{timer.label}</div>
            <div className="text-[11px] text-ink-400">
              {done ? 'Rest is over — next set.' : 'Resting. Talk, then get back under it.'}
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
/*  Exercise card                                                      */
/* ------------------------------------------------------------------ */

const TAG_STYLE: Record<string, string> = {
  main: 'bg-[color-mix(in_oklab,var(--accent-from)_18%,transparent)] text-[var(--accent-text)] border-[color-mix(in_oklab,var(--accent-from)_40%,transparent)]',
  secondary: 'bg-white/[0.07] text-ink-200 border-white/12',
  accessory: 'bg-white/[0.03] text-ink-400 border-white/[0.08]',
  finisher: 'bg-amber-400/10 text-amber-300/90 border-amber-400/25',
  core: 'bg-sky-400/10 text-sky-300/90 border-sky-400/25',
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
    load.pct != null && !ex.perHand && !ex.bodyweightBased && (ex.equip === 'Barbell' || ex.equip === 'EZ Bar')
      ? plateBreakdown(load.weight, profile.unit)
      : null

  const completed = Array.from({ length: sets }, (_, i) => isDone(dayKey, ex.id, i))
  const allDone = completed.every(Boolean)

  return (
    <article
      className={`card overflow-hidden transition-all ${allDone ? 'opacity-55' : ''}`}
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <div className="num mt-0.5 hidden w-7 shrink-0 text-lg font-bold text-ink-600 sm:block">
            {String(index + 1).padStart(2, '0')}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${TAG_STYLE[ex.tag]}`}
              >
                {ex.tag}
              </span>
              <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">
                {ex.equip}
              </span>
              {ex.rpe && <span className="text-[10px] font-semibold text-ink-500">{ex.rpe}</span>}
            </div>
            <h3 className="text-base font-bold leading-tight text-ink-100 sm:text-lg">{ex.name}</h3>
            <div className="num mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
              <span className="font-bold text-ink-200">
                {sets} × {ex.reps}
              </span>
              <span className="text-ink-600">|</span>
              <span>rest {fmtClock(ex.rest)}</span>
            </div>
          </div>

          {/* The number you actually put on the bar */}
          <div className="w-full shrink-0 text-left sm:w-[210px] sm:text-right">
            <div
              className={`num text-2xl font-bold leading-none sm:text-3xl ${
                load.pct != null ? 'accent-text-grad' : 'text-ink-300'
              }`}
            >
              {load.display}
            </div>
            {load.basis && (
              <div className="mt-1.5 text-[10px] leading-tight text-ink-500">
                {load.basis}
                {load.estimated && <span className="ml-1 text-amber-400/80">· estimated</span>}
              </div>
            )}
            {plates && <div className="num mt-0.5 text-[10px] text-ink-600">{plates}</div>}
            {load.pct == null && ex.loadNote && (
              <div className="mt-1.5 text-[10px] leading-snug text-ink-500">{ex.loadNote}</div>
            )}
          </div>
        </div>

        {/* Set tracker */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {completed.map((isSetDone, i) => (
            <button
              key={i}
              onClick={() => {
                toggleDone(dayKey, ex.id, i)
                if (!isSetDone && i < sets - 1) onRest(`${ex.name} — set ${i + 2} of ${sets}`, ex.rest)
              }}
              title={isSetDone ? `Undo set ${i + 1}` : `Complete set ${i + 1} and start the rest timer`}
              className={`focus-accent num grid size-9 place-items-center rounded-lg border text-xs font-bold transition-all active:scale-90 ${
                isSetDone
                  ? 'accent-grad border-transparent text-black'
                  : 'border-white/12 bg-white/[0.04] text-ink-400 hover:border-white/30 hover:text-ink-100'
              }`}
            >
              {isSetDone ? '✓' : i + 1}
            </button>
          ))}
          <button
            onClick={() => setOpen((o) => !o)}
            className="focus-accent ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-400 transition-colors hover:bg-white/[0.06] hover:text-ink-100"
            aria-expanded={open}
          >
            How to
            <svg
              viewBox="0 0 24 24"
              className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
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
        <div className="space-y-3 border-t border-white/[0.07] bg-black/25 p-4 sm:p-5">
          <Detail label="Form">{ex.cue}</Detail>
          {ex.why && <Detail label="Why it's here">{ex.why}</Detail>}
          {/* When there's no calculated weight the note already sits under the
              headline, so don't repeat it here. */}
          {ex.loadNote && load.pct != null && <Detail label="Loading">{ex.loadNote}</Detail>}
        </div>
      )}
    </article>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[104px_1fr] sm:gap-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">{label}</div>
      <p className="text-sm leading-relaxed text-ink-300">{children}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Rest day                                                           */
/* ------------------------------------------------------------------ */

function RestDay({ day }: { day: Day }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent p-6 sm:p-8">
        <div className="display text-4xl text-ink-100 sm:text-5xl">{day.title}</div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-300">{day.blurb}</p>
      </div>
      <ul className="divide-y divide-white/[0.05]">
        {day.finisher.map((f, i) => (
          <li key={i} className="flex gap-4 p-4 sm:p-5">
            <span className="num mt-0.5 shrink-0 text-sm font-bold text-ink-600">{i + 1}</span>
            <span className="text-sm leading-relaxed text-ink-200">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main view                                                          */
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

  // Keep the Wednesday card in sync when the legs/arms switch is flipped.
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
    <div className="rise">
      {/* Hero */}
      <section className="mb-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Pill tone="accent">{profile.name}</Pill>
              <Pill tone="muted">
                Week {spec.week} · {spec.name}
              </Pill>
            </div>
            <h1 className="display text-4xl leading-[0.9] text-ink-100 sm:text-6xl">
              Five days.
              <br />
              <span className="accent-text-grad">Get strong.</span>
            </h1>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-500">
              Training week
            </span>
            <div className="inline-flex rounded-xl border border-white/10 bg-black/30 p-1">
              {WEEKS.map((w) => (
                <button
                  key={w.week}
                  onClick={() => setWeek(w.week)}
                  title={`${w.name} — ${w.note}`}
                  className={`focus-accent num rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    w.week === spec.week ? 'accent-grad text-black shadow' : 'text-ink-400 hover:text-ink-100'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card flex items-start gap-3 p-4">
          <span className="accent-grad mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-black text-black">
            {spec.label}
          </span>
          <p className="text-sm leading-relaxed text-ink-300">
            <span className="font-bold text-ink-100">{spec.name}.</span> {spec.note}
          </p>
        </div>
      </section>

      {/* Day rail */}
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {rail.map((d) => {
          const active = d.key === selected
          const dayIsToday = d.key === todayKey(wednesday)
          return (
            <button
              key={d.key}
              onClick={() => setSelected(d.key)}
              className={`focus-accent group relative min-w-[92px] flex-1 shrink-0 overflow-hidden rounded-xl border p-3 text-left transition-all sm:min-w-0 ${
                active
                  ? 'border-white/25 bg-white/[0.08]'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <span
                className="absolute inset-x-0 top-0 h-0.5 transition-opacity"
                style={{ background: d.hue, opacity: active ? 1 : 0.28 }}
              />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-500">
                  {d.short}
                </span>
                {dayIsToday && <span className="size-1.5 rounded-full" style={{ background: d.hue }} />}
              </div>
              <div
                className={`display mt-1 text-base leading-tight ${active ? 'text-ink-100' : 'text-ink-300'}`}
              >
                {d.title.replace(' — ', ' ')}
              </div>
            </button>
          )
        })}
      </div>

      {/* Day header */}
      <section className="card mb-6 overflow-hidden">
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, ${day.hue}, transparent)` }}
        />
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-ink-500">
                  {day.weekday}
                </span>
                {isToday && <Pill tone="accent">Today</Pill>}
              </div>
              <h2 className="display text-3xl text-ink-100 sm:text-4xl">{day.title}</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider" style={{ color: day.hue }}>
                {day.focus}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-300">{day.blurb}</p>
            </div>

            {day.alt && (
              <div className="flex flex-col items-start gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">
                  Wednesday is
                </span>
                <div className="inline-flex rounded-xl border border-white/10 bg-black/30 p-1">
                  {(['legs', 'arms'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setWednesday(v)}
                      className={`focus-accent rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                        wednesday === v ? 'accent-grad text-black shadow' : 'text-ink-400 hover:text-ink-100'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <span className="max-w-[170px] text-[10px] leading-snug text-ink-500">
                  Alternate it week to week. Legs one week, arms the next.
                </span>
              </div>
            )}
          </div>

          {!day.rest && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label="Time" value={fmtMinutes(minutes)} />
                <MiniStat label="Exercises" value={String(day.exercises.length)} />
                <MiniStat label="Work sets" value={String(totalSets)} />
                <MiniStat label="Done" value={`${progress}%`} accent={progress > 0} />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="accent-grad h-full transition-[width] duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {done > 0 && (
                  <Button size="sm" variant="outline" onClick={() => clearDay(day.key)}>
                    Reset day
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {day.rest ? (
        <RestDay day={day} />
      ) : (
        <>
          {/* Warmup */}
          <section className="mb-8">
            <SectionTitle
              kicker={`${day.warmup.reduce((a, b) => a + b.minutes, 0)} minutes`}
              title="Warm-up"
              sub="Do not skip it and do not rush it. A warm joint lifts more than a cold one, and warm-up sets never count toward your work sets."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {day.warmup.map((w, i) => (
                <div key={i} className="card flex gap-4 p-4">
                  <span className="num mt-0.5 shrink-0 text-xs font-bold text-ink-600">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-sm font-bold text-ink-100">{w.name}</h4>
                      <span className="num text-[11px] text-ink-500">{w.minutes}m</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-400">{w.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* The work */}
          <section className="mb-8">
            <SectionTitle
              kicker={`${totalSets} work sets`}
              title="The session"
              sub="Tap a set when you finish it — the rest timer starts on its own. Every weight is calculated from your PRs, so keep those honest."
            />
            <div className="space-y-3">
              {day.exercises.map((ex, i) => (
                <ExerciseCard key={ex.id} ex={ex} index={i} dayKey={day.key} onRest={rest.start} />
              ))}
            </div>
          </section>

          {/* Finisher */}
          <section>
            <SectionTitle kicker="Before you leave" title="Cool-down" />
            <div className="card divide-y divide-white/[0.05]">
              {day.finisher.map((f, i) => (
                <div key={i} className="flex gap-4 p-4">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: day.hue }} />
                  <span className="text-sm leading-relaxed text-ink-300">{f}</span>
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
    <div className="rounded-xl border border-white/[0.07] bg-black/25 p-3">
      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink-500">{label}</div>
      <div className={`num mt-1 text-lg font-bold ${accent ? 'accent-text-grad' : 'text-ink-100'}`}>
        {value}
      </div>
    </div>
  )
}
