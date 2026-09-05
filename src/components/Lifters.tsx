import { useState } from 'react'
import { ACCENTS, useStore } from '../lib/store'
import { PR_HINT, PR_LABEL, estimate1RM, resolvePR, targetsFor } from '../lib/calc'
import { PR_KEYS, type AccentKey, type BodyweightEntry, type Lifter, type PRKey } from '../lib/types'
import { Button, Field, NumberInput, Segmented, Select, TextInput, Tag, useDraft } from './ui'

const PR_GROUPS: { title: string; keys: PRKey[] }[] = [
  { title: 'Press', keys: ['bench', 'inclineBench', 'cgbp', 'ohp', 'dbBench'] },
  { title: 'Pull', keys: ['deadlift', 'row', 'dbRow', 'pulldown', 'pullup'] },
  { title: 'Legs & arms', keys: ['squat', 'rdl', 'curl'] },
]

const HEADLINE: PRKey[] = ['bench', 'squat', 'deadlift']

/* ------------------------------------------------------------------ */
/*  Bodyweight sparkline — only drawn when real history exists          */
/* ------------------------------------------------------------------ */

function Sparkline({ entries }: { entries: BodyweightEntry[] }) {
  if (entries.length < 2) return null
  const w = 260
  const h = 44
  const values = entries.map((e) => e.weight)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = entries.map((e, i) => {
    const x = (i / (entries.length - 1)) * (w - 2) + 1
    const y = h - 4 - ((e.weight - min) / span) * (h - 10)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-full max-w-[260px]" role="img" aria-label="Bodyweight trend">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="var(--lifter)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="2.5" fill="var(--lifter)" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */

function PRField({ lifterId, lift }: { lifterId: string; lift: PRKey }) {
  const { lifter, setPR, prDelta } = useStore()
  const entered = lifter.prs[lift]
  const resolved = resolvePR(lifter, lift)
  const [draft, setDraft] = useDraft(entered ? String(entered) : '')
  const delta = prDelta(lifterId, lift)

  return (
    <div className="flex items-center gap-3 border-b border-rule-soft py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[13.5px] font-600 text-ink">{PR_LABEL[lift]}</span>
          {!resolved.entered && <span className="text-[11px] font-medium text-warn">Estimated</span>}
          {delta != null && delta !== 0 && (
            <span className={`mono text-[11.5px] font-semibold ${delta > 0 ? 'text-good' : 'text-ink-3'}`}>
              {delta > 0 ? '+' : ''}
              {delta} {lifter.unit}
            </span>
          )}
        </div>
        <p className="t-meta mt-0.5 text-[11.5px]">{PR_HINT[lift]}</p>
      </div>
      <NumberInput
        className="w-[104px] shrink-0"
        ariaLabel={`${PR_LABEL[lift]} one rep max`}
        value={draft}
        placeholder={String(Math.round(resolved.value))}
        suffix={lifter.unit}
        onChange={setDraft}
        onCommit={(v) => {
          const n = Number.parseFloat(v)
          setPR(lifterId, lift, Number.isFinite(n) && n > 0 ? n : undefined)
        }}
      />
    </div>
  )
}

function OneRepCalculator() {
  const { lifter, setPR } = useStore()
  const [lift, setLift] = useState<PRKey>('bench')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('5')

  const w = Number.parseFloat(weight)
  const r = Number.parseInt(reps, 10)
  const est = estimate1RM(Number.isFinite(w) ? w : 0, Number.isFinite(r) ? r : 0)

  return (
    <div className="panel p-4">
      <h3 className="t-item">Estimate a max</h3>
      <p className="t-meta mt-0.5">
        From a set you have actually done. Most accurate at 3–8 reps.
      </p>
      <div className="mt-3.5 grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Field label="Lift">
          {(id) => (
            <Select id={id} value={lift} onChange={(v) => setLift(v as PRKey)}>
              {PR_KEYS.map((k) => (
                <option key={k} value={k}>
                  {PR_LABEL[k]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={`Weight (${lifter.unit})`}>
          {(id) => <NumberInput id={id} value={weight} placeholder="185" onChange={setWeight} />}
        </Field>
        <Field label="Reps">
          {(id) => <NumberInput id={id} value={reps} placeholder="5" onChange={setReps} />}
        </Field>
      </div>
      <div className="mt-3.5 flex flex-wrap items-end justify-between gap-3 border-t border-rule pt-3.5">
        <div>
          <span className="t-label">Estimated 1RM</span>
          <div className="mono mt-1 text-[24px] font-600 leading-none text-ink">
            {est || '—'}
            {est ? <span className="ml-1 text-[13px] font-medium text-ink-3">{lifter.unit}</span> : null}
          </div>
        </div>
        <Button variant="primary" disabled={!est} onClick={() => setPR(lifter.id, lift, est)}>
          Save as {PR_LABEL[lift]}
        </Button>
      </div>
    </div>
  )
}

function ColorPicker({
  value,
  onChange,
}: {
  value: AccentKey
  onChange: (k: AccentKey) => void
}) {
  return (
    <div className="flex gap-1.5">
      {(Object.keys(ACCENTS) as AccentKey[]).map((k) => {
        const active = value === k
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            title={ACCENTS[k].name}
            aria-label={ACCENTS[k].name}
            aria-pressed={active}
            className={`focus-ring grid size-6 place-items-center rounded-full transition-transform duration-[--t-fast] ${
              active ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : 'hover:scale-110'
            }`}
            style={{ background: ACCENTS[k].base }}
          />
        )
      })}
    </div>
  )
}

function AddLifter() {
  const { addLifter, lifters } = useStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const used = new Set(lifters.map((l) => l.accent))
  const free = (Object.keys(ACCENTS) as AccentKey[]).find((k) => !used.has(k)) ?? 'volt'
  const [accent, setAccent] = useState<AccentKey>(free)

  const submit = () => {
    if (!name.trim()) return
    addLifter(name, accent)
    setName('')
    setOpen(false)
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M8 3.5v9M3.5 8h9" />
        </svg>
        Add lifter
      </Button>
    )
  }

  return (
    <div className="panel flex flex-wrap items-end gap-3 p-3.5">
      <Field label="Name" className="min-w-[160px] flex-1">
        {(id) => (
          <TextInput
            id={id}
            value={name}
            placeholder="Name"
            onChange={setName}
            onCommit={() => undefined}
          />
        )}
      </Field>
      <div>
        <span className="t-label mb-1.5 block">Colour</span>
        <div className="flex h-9 items-center">
          <ColorPicker value={accent} onChange={setAccent} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="primary" disabled={!name.trim()} onClick={submit}>
          Add
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function LifterCard({ l, active, onSelect }: { l: Lifter; active: boolean; onSelect: () => void }) {
  const a = ACCENTS[l.accent] ?? ACCENTS.ember
  return (
    <button
      onClick={onSelect}
      aria-pressed={active}
      className={`focus-ring relative overflow-hidden rounded-[--radius-lg] border p-4 text-left transition-colors duration-[--t-fast] ${
        active ? 'border-rule-strong bg-surface' : 'border-rule bg-surface hover:bg-sunken'
      }`}
    >
      {/* Thin coloured edge instead of an ACTIVE badge */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] transition-opacity duration-[--t-fast]"
        style={{ background: a.base, opacity: active ? 1 : 0.22 }}
      />
      <div className="flex items-baseline justify-between gap-3 pl-1.5">
        <h3 className="t-item text-[15px]">{l.name}</h3>
        <span className="t-meta">{l.goal === 'bulk' ? 'Bulking' : 'Cutting'}</span>
      </div>
      <div className="mono mt-0.5 pl-1.5 text-[12.5px] text-ink-3">
        {l.bodyweight} {l.unit} · week {l.trainingWeek}
      </div>
      <dl className="mt-3 flex gap-5 pl-1.5">
        {HEADLINE.map((k) => (
          <div key={k}>
            <dt className="t-label">{k === 'deadlift' ? 'Pull' : k === 'bench' ? 'Bench' : 'Squat'}</dt>
            <dd className="mono mt-0.5 text-[14px] font-600 text-ink">
              {Math.round(resolvePR(l, k).value)}
            </dd>
          </div>
        ))}
      </dl>
    </button>
  )
}

export default function Lifters() {
  const { lifter, lifters, setActive, updateLifter, removeLifter, bodyweightHistory } = useStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useDraft(lifter.name)
  const [bw, setBw] = useDraft(String(lifter.bodyweight))

  const targets = targetsFor(lifter)
  const history = bodyweightHistory(lifter.id)
  const first = history[0]
  const latest = history[history.length - 1]
  const change = first && latest && history.length > 1 ? latest.weight - first.weight : null
  const tested = PR_KEYS.filter((k) => lifter.prs[k]).length

  return (
    <div className="enter">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="t-page">Lifters</h1>
          <p className="t-body mt-1.5 max-w-lg">
            Every load in the program is a percentage of these numbers. Blanks are estimated from the
            lifts you have filled in.
          </p>
        </div>
        <AddLifter />
      </div>

      <section className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {lifters.map((l) => (
          <LifterCard key={l.id} l={l} active={l.id === lifter.id} onSelect={() => setActive(l.id)} />
        ))}
      </section>

      {/* Profile */}
      <section className="mt-9">
        <h2 className="t-section border-b border-rule pb-2">{lifter.name}&apos;s profile</h2>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Name">
              {(id) => (
                <TextInput
                  id={id}
                  value={name}
                  onChange={setName}
                  onCommit={(v) => updateLifter(lifter.id, { name: v.trim() || lifter.name })}
                />
              )}
            </Field>
            <Field label={`Bodyweight (${lifter.unit})`} hint="Drives calorie and protein targets.">
              {(id) => (
                <NumberInput
                  id={id}
                  value={bw}
                  suffix={lifter.unit}
                  onChange={setBw}
                  onCommit={(v) => {
                    const n = Number.parseFloat(v)
                    if (Number.isFinite(n) && n > 0) updateLifter(lifter.id, { bodyweight: n })
                    else setBw(String(lifter.bodyweight))
                  }}
                />
              )}
            </Field>

            <div>
              <span className="t-label mb-1.5 block">Goal</span>
              <Segmented
                ariaLabel="Goal"
                value={lifter.goal}
                onChange={(goal) => updateLifter(lifter.id, { goal })}
                options={[
                  { value: 'bulk', label: 'Bulk' },
                  { value: 'cut', label: 'Cut' },
                ]}
              />
            </div>
            <div>
              <span className="t-label mb-1.5 block">Units</span>
              <Segmented
                ariaLabel="Units"
                value={lifter.unit}
                onChange={(unit) => updateLifter(lifter.id, { unit })}
                options={[
                  { value: 'lb', label: 'lb' },
                  { value: 'kg', label: 'kg' },
                ]}
              />
            </div>

            <div className="sm:col-span-2">
              <span className="t-label mb-1.5 block">Colour</span>
              <ColorPicker value={lifter.accent} onChange={(accent) => updateLifter(lifter.id, { accent })} />
            </div>
          </div>

          {/* Bodyweight + targets */}
          <div className="panel p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="t-label">Bodyweight</span>
                <div className="mono mt-1 text-[26px] font-600 leading-none text-ink">
                  {lifter.bodyweight}
                  <span className="ml-1 text-[13px] font-medium text-ink-3">{lifter.unit}</span>
                </div>
                {change != null && change !== 0 ? (
                  <p className="mono mt-1.5 text-[12px] text-ink-3">
                    <span className={change > 0 ? 'text-good' : 'text-ink-2'}>
                      {change > 0 ? '+' : ''}
                      {Math.round(change * 10) / 10} {lifter.unit}
                    </span>{' '}
                    since {first.loggedOn}
                  </p>
                ) : (
                  <p className="t-meta mt-1.5">
                    {history.length > 1 ? 'No change yet.' : 'History builds as you update it.'}
                  </p>
                )}
              </div>
              <Sparkline entries={history} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-rule pt-3.5">
              <div>
                <div className="mono text-[15px] font-600 leading-none text-ink">
                  {targets.kcal.toLocaleString()}
                </div>
                <div className="t-label mt-1">kcal</div>
              </div>
              <div>
                <div className="mono text-[15px] font-600 leading-none text-ink">{targets.protein}g</div>
                <div className="t-label mt-1">Protein</div>
              </div>
              <div>
                <div className="mono text-[15px] font-600 leading-none text-ink">
                  {tested}/{PR_KEYS.length}
                </div>
                <div className="t-label mt-1">Lifts tested</div>
              </div>
            </div>
          </div>
        </div>

        {lifters.length > 1 && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-rule pt-4">
            {confirmDelete ? (
              <>
                <span className="t-meta">
                  Delete {lifter.name}? Their PRs, bodyweight history and logged sets go too.
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    removeLifter(lifter.id)
                    setConfirmDelete(false)
                  }}
                >
                  Delete permanently
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="focus-ring rounded-[--radius-sm] text-[12.5px] font-medium text-ink-3 underline decoration-rule-strong underline-offset-2 transition-colors duration-[--t-fast] hover:text-bad"
              >
                Delete {lifter.name}
              </button>
            )}
          </div>
        )}
      </section>

      {/* PRs */}
      <section className="mt-9">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-2">
          <h2 className="t-section">Personal records</h2>
          <span className="t-meta">One-rep maxes. Saved as you type.</span>
        </div>
        <div className="mt-1 grid gap-x-10 lg:grid-cols-2">
          {PR_GROUPS.map((g) => (
            <div key={g.title} className="mt-4">
              <h3 className="t-label mb-1">{g.title}</h3>
              {g.keys.map((k) => (
                <PRField key={k} lifterId={lifter.id} lift={k} />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <OneRepCalculator />
      </section>

      <section className="mt-8 border-t border-rule pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="good">Saved to the database</Tag>
          <p className="t-meta">
            Lifters, PRs, bodyweight history and logged sets live in Postgres — the same numbers load
            on any phone or laptop.
          </p>
        </div>
      </section>
    </div>
  )
}
