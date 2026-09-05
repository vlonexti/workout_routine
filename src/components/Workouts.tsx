import { useEffect, useMemo, useState } from 'react'
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
import { Button, Chevron, Segmented, Tag } from './ui'

/** First number in a rep prescription — what we log when a set is ticked. */
function targetReps(reps: string): number | null {
  const m = reps.match(/\d+/)
  return m ? Number.parseInt(m[0], 10) : null
}

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

const TAG_LABEL: Record<string, string> = {
  main: 'Main',
  secondary: 'Secondary',
  accessory: 'Accessory',
  finisher: 'Finisher',
  core: 'Core',
}

/* ------------------------------------------------------------------ */
/*  Exercise row                                                       */
/* ------------------------------------------------------------------ */

function ExerciseRow({ ex, dayKey, week }: { ex: Exercise; dayKey: string; week: number }) {
  const { lifter, isSetDone, toggleSet, lastSession } = useStore()
  const [open, setOpen] = useState(false)

  const load = computeLoad(lifter, ex, week)
  const sets = exerciseSets(ex, week)
  const plates =
    load.pct != null &&
    !ex.perHand &&
    !ex.bodyweightBased &&
    (ex.equip === 'Barbell' || ex.equip === 'EZ Bar')
      ? plateBreakdown(load.weight, lifter.unit)
      : null

  const done = Array.from({ length: sets }, (_, i) => isSetDone(dayKey, ex.id, i))
  const complete = done.every(Boolean)
  const last = lastSession(ex.id)
  const reps = targetReps(ex.reps)

  const pctLabel = load.pct != null ? ` @ ${Math.round(load.pct * 100)}%` : ''

  return (
    <div className={`border-b border-rule-soft transition-opacity duration-[--t-base] ${complete ? 'opacity-55' : ''}`}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2.5 py-3.5">
        {/* Name and prescription */}
        <div className="min-w-[190px] flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="t-item">{ex.name}</h3>
            <span className="t-label">{TAG_LABEL[ex.tag]}</span>
          </div>
          <div className="mono mt-1 text-[12.5px] text-ink-2">
            {sets} × {ex.reps}
            {pctLabel}
            <span className="text-ink-4"> · </span>
            <span className="text-ink-3">rest {fmtClock(ex.rest)}</span>
          </div>
          {last && (
            <div className="t-meta mt-0.5">
              Last session:{' '}
              <span className="mono text-ink-2">
                {last.weight ?? '—'}
                {last.weight != null ? ` ${lifter.unit}` : ''}
                {last.reps != null ? ` × ${last.reps}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Target load */}
        <div className="w-[124px] shrink-0 text-right sm:w-[152px]">
          <div className="mono text-[16px] font-600 leading-none text-ink">{load.display}</div>
          {plates && <div className="mono mt-1 text-[11.5px] text-ink-3">{plates}</div>}
          {load.estimated && <div className="mt-1 text-[11px] text-warn">Estimated PR</div>}
          {load.pct == null && ex.loadNote && (
            <div className="mt-1 text-[11.5px] leading-snug text-ink-3">{ex.loadNote}</div>
          )}
        </div>

        {/* Set ticks */}
        <div className="flex w-full items-center gap-1 sm:w-auto">
          {done.map((isDone, i) => (
            <button
              key={i}
              onClick={() => toggleSet(dayKey, ex.id, i, load.pct != null ? load.weight : null, reps)}
              aria-label={isDone ? `Undo set ${i + 1}` : `Log set ${i + 1}`}
              aria-pressed={isDone}
              title={isDone ? `Set ${i + 1} logged — click to undo` : `Log set ${i + 1}`}
              className={`focus-ring mono grid size-6 place-items-center rounded-[--radius-sm] border text-[11px] font-semibold transition-colors duration-[--t-fast] ${
                isDone
                  ? 'border-accent bg-accent text-white'
                  : 'border-rule bg-surface text-ink-4 hover:border-rule-strong hover:text-ink-2'
              }`}
            >
              {isDone ? '✓' : i + 1}
            </button>
          ))}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="focus-ring ml-auto inline-flex h-6 items-center gap-1 rounded-[--radius-sm] px-1.5 text-[11.5px] font-semibold text-ink-3 transition-colors duration-[--t-fast] hover:bg-sunken hover:text-ink sm:ml-1"
          >
            Notes
            <Chevron open={open} />
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-2.5 pb-4 sm:grid-cols-[92px_1fr] sm:gap-x-5">
          <span className="t-label sm:pt-0.5">Form</span>
          <p className="t-body">{ex.cue}</p>
          {ex.why && (
            <>
              <span className="t-label sm:pt-0.5">Purpose</span>
              <p className="t-body">{ex.why}</p>
            </>
          )}
          {ex.loadNote && load.pct != null && (
            <>
              <span className="t-label sm:pt-0.5">Loading</span>
              <p className="t-body">{ex.loadNote}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Weekly schedule                                                    */
/* ------------------------------------------------------------------ */

function Schedule({
  days,
  selected,
  today,
  onSelect,
  progressFor,
}: {
  days: Day[]
  selected: string
  today: string
  onSelect: (key: string) => void
  progressFor: (d: Day) => { done: number; total: number }
}) {
  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-[640px] overflow-hidden rounded-[--radius-lg] border border-rule bg-surface">
        {days.map((d, i) => {
          const active = d.key === selected
          const isToday = d.key === today
          const { done, total } = progressFor(d)
          const complete = total > 0 && done >= total
          const started = done > 0 && !complete

          return (
            <button
              key={d.key}
              onClick={() => onSelect(d.key)}
              aria-current={active ? 'true' : undefined}
              className={`focus-ring relative flex-1 px-3 py-2.5 text-left transition-colors duration-[--t-fast] ${
                i > 0 ? 'border-l border-rule' : ''
              } ${active ? 'bg-accent-bg' : 'hover:bg-sunken'}`}
            >
              {active && <span className="absolute inset-x-0 top-0 h-[2px] bg-accent" />}
              <div className="flex items-center gap-1.5">
                <span
                  className={`t-label ${active ? 'text-accent' : ''}`}
                  style={active ? undefined : undefined}
                >
                  {d.short}
                </span>
                {isToday && (
                  <span
                    aria-label="Today"
                    className="size-[5px] rounded-full"
                    style={{ background: 'var(--lifter)' }}
                  />
                )}
              </div>
              <div
                className={`mt-1 text-[12.5px] font-600 leading-tight ${
                  d.rest ? 'text-ink-4' : active ? 'text-accent' : 'text-ink-2'
                }`}
              >
                {d.title.replace(' — ', ' ')}
              </div>
              <div className="mt-1.5 h-[3px]">
                {complete ? (
                  <span className="flex items-center gap-1 text-[10.5px] font-semibold text-good">
                    <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
                    </svg>
                    Done
                  </span>
                ) : started ? (
                  <span className="mono text-[10.5px] font-medium text-ink-3">
                    {done}/{total}
                  </span>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function Workouts() {
  const { lifter, setTrainingWeek, setWednesday, doneToday, clearDay } = useStore()
  const week = lifter.trainingWeek
  const wednesday = lifter.wednesday
  const today = todayKey(wednesday)
  const [selected, setSelected] = useState(today)

  useEffect(() => {
    setSelected((s) =>
      s === 'wed' || s === 'wed-arms' ? (wednesday === 'arms' ? 'wed-arms' : 'wed') : s,
    )
  }, [wednesday])

  const days = useMemo(
    () => DAYS.filter((d) => (wednesday === 'arms' ? d.key !== 'wed' : d.key !== 'wed-arms')),
    [wednesday],
  )
  const day = DAYS.find((d) => d.key === selected) ?? DAYS[0]
  const spec = weekSpec(week)

  const totalSets = day.exercises.reduce((a, e) => a + exerciseSets(e, week), 0)
  const minutes = day.rest ? 0 : sessionMinutes(day.warmup, day.exercises, week)
  const done = doneToday(day.key)
  const warmupMinutes = day.warmup.reduce((a, b) => a + b.minutes, 0)

  const progressFor = (d: Day) => ({
    done: doneToday(d.key),
    total: d.exercises.reduce((a, e) => a + exerciseSets(e, week), 0),
  })

  return (
    <div className="enter">
      {/* Page head — week selector lives here rather than floating on the right */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="t-page">Five days a week.</h1>
          <p className="t-body mt-1.5 max-w-md">
            Loads are calculated from {lifter.name}&apos;s PRs. Update the PRs and every number moves.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <span className="t-label">Training week</span>
          <Segmented
            ariaLabel="Training week"
            value={String(week)}
            onChange={(v) => setTrainingWeek(Number(v))}
            options={WEEKS.map((w) => ({ value: String(w.week), label: w.label }))}
          />
        </div>
      </div>

      {/* Cycle phase */}
      <div className="mt-5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-y border-rule py-3">
        <span className="t-item">
          Week {spec.week} · {spec.name}
        </span>
        <p className="t-body flex-1 basis-full sm:basis-auto">{spec.note}</p>
      </div>

      {/* Weekly schedule */}
      <div className="mt-6">
        <Schedule
          days={days}
          selected={selected}
          today={today}
          onSelect={setSelected}
          progressFor={progressFor}
        />
      </div>

      {/* Selected day */}
      <section className="mt-8">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="t-page text-[22px] sm:text-[26px]">{day.title}</h2>
              {day.key === today && <Tag tone="accent">Today</Tag>}
            </div>
            <p className="t-meta mt-1">
              {day.weekday} · {day.focus}
            </p>
          </div>

          {day.alt && (
            <div className="flex flex-col items-start gap-1.5">
              <span className="t-label">Wednesday</span>
              <Segmented
                size="sm"
                ariaLabel="Wednesday variant"
                value={wednesday}
                onChange={setWednesday}
                options={[
                  { value: 'legs', label: 'Legs' },
                  { value: 'arms', label: 'Arms' },
                ]}
              />
            </div>
          )}
        </div>

        <p className="t-body mt-3 max-w-2xl">{day.blurb}</p>

        {!day.rest && (
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-rule py-3 sm:gap-x-7">
            <Figure value={fmtMinutes(minutes)} label="Duration" />
            <Divider />
            <Figure value={String(day.exercises.length)} label="Exercises" />
            <Divider />
            <Figure value={String(totalSets)} label="Working sets" />
            {done > 0 && (
              <>
                <Divider />
                <Figure value={`${done}/${totalSets}`} label="Logged today" accent />
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => clearDay(day.key)}>
                  Reset day
                </Button>
              </>
            )}
          </div>
        )}
      </section>

      {day.rest ? (
        <section className="mt-8">
          <h3 className="t-section">Recovery</h3>
          <ul className="mt-3 border-t border-rule">
            {day.finisher.map((f, i) => (
              <li key={i} className="flex gap-3.5 border-b border-rule-soft py-3">
                <span className="mono w-4 shrink-0 text-[12.5px] text-ink-4">{i + 1}</span>
                <span className="t-body text-ink-2">{f}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <section className="mt-9">
            <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
              <h3 className="t-section">Warm-up</h3>
              <span className="t-meta mono">{warmupMinutes} min</span>
            </div>
            <div className="grid sm:grid-cols-2 sm:gap-x-8">
              {day.warmup.map((w, i) => (
                <div key={i} className="flex gap-3.5 border-b border-rule-soft py-3">
                  <span className="mono w-4 shrink-0 text-[12.5px] text-ink-4">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h4 className="t-item text-[13.5px]">{w.name}</h4>
                      <span className="mono text-[11.5px] text-ink-3">{w.minutes}m</span>
                    </div>
                    <p className="t-meta mt-0.5">{w.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-9">
            <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
              <h3 className="t-section">Session</h3>
              <span className="t-meta">Tap a set number to log it</span>
            </div>
            <div>
              {day.exercises.map((ex) => (
                <ExerciseRow key={ex.id} ex={ex} dayKey={day.key} week={week} />
              ))}
            </div>
          </section>

          <section className="mt-9">
            <h3 className="t-section border-b border-rule pb-2">Cool-down</h3>
            <ul>
              {day.finisher.map((f, i) => (
                <li key={i} className="flex gap-3.5 border-b border-rule-soft py-3">
                  <span className="mono w-4 shrink-0 text-[12.5px] text-ink-4">{i + 1}</span>
                  <span className="t-body text-ink-2">{f}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

    </div>
  )
}

function Figure({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={`mono text-[16px] font-600 leading-none ${accent ? 'text-accent' : 'text-ink'}`}>
        {value}
      </div>
      <div className="t-label mt-1.5">{label}</div>
    </div>
  )
}

function Divider() {
  return <span aria-hidden className="hidden h-7 w-px bg-rule sm:block" />
}
