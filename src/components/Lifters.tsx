import { useEffect, useRef, useState } from 'react'
import { ACCENTS, useStore } from '../lib/store'
import { PR_HINT, PR_LABEL, estimate1RM, resolvePR, targetsFor } from '../lib/calc'
import type { AccentKey, PRKey } from '../lib/types'
import { Button, Pill, SectionTitle, Segmented, Stat } from './ui'

const PR_GROUPS: { title: string; note: string; keys: PRKey[] }[] = [
  {
    title: 'Press',
    note: 'Drives Monday and Thursday, plus every triceps and shoulder movement.',
    keys: ['bench', 'inclineBench', 'cgbp', 'ohp', 'dbBench'],
  },
  {
    title: 'Pull',
    note: 'Drives Tuesday and Friday — rows, pulldowns, pull-ups.',
    keys: ['deadlift', 'row', 'dbRow', 'pulldown', 'pullup'],
  },
  {
    title: 'Legs & arms',
    note: 'Drives Wednesday, whichever version you are running.',
    keys: ['squat', 'rdl', 'curl'],
  },
]

function PRRow({ prKey, profileId }: { prKey: PRKey; profileId: string }) {
  const { profile, setPR } = useStore()
  const resolved = resolvePR(profile, prKey)
  const entered = profile.prs[prKey]
  const [draft, setDraft] = useState(entered ? String(entered) : '')

  // Reset the field when you switch to a different lifter.
  useEffect(() => {
    setDraft(entered ? String(entered) : '')
  }, [profileId, entered])

  function commit(raw: string) {
    const n = Number.parseFloat(raw)
    setPR(profileId, prKey, Number.isFinite(n) && n > 0 ? n : undefined)
  }

  return (
    <div className="flex items-center gap-3 p-3 sm:p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-ink-100">{PR_LABEL[prKey]}</span>
          {!resolved.entered && (
            <span className="rounded border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-300/90">
              Estimated
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-ink-500">{PR_HINT[prKey]}</p>
      </div>
      <div className="relative shrink-0">
        <input
          inputMode="decimal"
          value={draft}
          placeholder={String(Math.round(resolved.value))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          aria-label={`${PR_LABEL[prKey]} one rep max`}
          className={`num focus-accent w-[104px] rounded-lg border bg-black/40 py-2 pl-3 pr-9 text-right text-sm font-bold transition-colors ${
            resolved.entered
              ? 'border-white/15 text-ink-100'
              : 'border-white/[0.08] text-ink-500 placeholder:text-ink-500'
          }`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-ink-500">
          {profile.unit}
        </span>
      </div>
    </div>
  )
}

function OneRepCalculator() {
  const { profile, setPR } = useStore()
  const [lift, setLift] = useState<PRKey>('bench')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('5')

  const w = Number.parseFloat(weight)
  const r = Number.parseInt(reps, 10)
  const est = estimate1RM(Number.isFinite(w) ? w : 0, Number.isFinite(r) ? r : 0)

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-ink-100">Do not know your 1-rep max?</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-400">
        You do not need to test a true max — that is risky and unnecessary. Take a set you know you can do,
        put the numbers in here, and use the estimate.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">Lift</span>
          <select
            value={lift}
            onChange={(e) => setLift(e.target.value as PRKey)}
            className="focus-accent mt-1.5 w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold text-ink-100"
          >
            {(Object.keys(PR_LABEL) as PRKey[]).map((k) => (
              <option key={k} value={k} className="bg-ink-850">
                {PR_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">
            Weight ({profile.unit})
          </span>
          <input
            inputMode="decimal"
            value={weight}
            placeholder="185"
            onChange={(e) => setWeight(e.target.value)}
            className="num focus-accent mt-1.5 w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm font-bold text-ink-100"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">Reps</span>
          <input
            inputMode="numeric"
            value={reps}
            placeholder="5"
            onChange={(e) => setReps(e.target.value)}
            className="num focus-accent mt-1.5 w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm font-bold text-ink-100"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-black/25 p-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">
            Estimated 1RM
          </div>
          <div className="num accent-text-grad text-3xl font-bold leading-tight">
            {est || '—'}{' '}
            {est ? <span className="text-base text-ink-400">{profile.unit}</span> : null}
          </div>
        </div>
        <Button
          variant="accent"
          className="ml-auto"
          disabled={!est}
          onClick={() => setPR(profile.id, lift, est)}
        >
          Save as {PR_LABEL[lift]} PR
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-ink-500">
        Most accurate between 3 and 8 reps. Above 10 reps it starts to overestimate.
      </p>
    </div>
  )
}

function AddLifter() {
  const { addProfile, profiles } = useStore()
  const [name, setName] = useState('')
  const used = new Set(profiles.map((p) => p.accent))
  const free = (Object.keys(ACCENTS) as AccentKey[]).find((k) => !used.has(k)) ?? 'ice'
  const [accent, setAccent] = useState<AccentKey>(free)

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-ink-100">Add a lifter</h3>
      <p className="mt-1 text-xs text-ink-400">
        Everyone gets their own PRs, bodyweight, goal and colour. The whole site retints when you switch.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[180px] flex-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">Name</span>
          <input
            value={name}
            placeholder="Who's lifting?"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                addProfile(name, accent)
                setName('')
              }
            }}
            className="focus-accent mt-1.5 w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold text-ink-100"
          />
        </label>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">Colour</span>
          <div className="mt-1.5 flex gap-1.5">
            {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setAccent(k)}
                title={ACCENTS[k].name}
                aria-label={ACCENTS[k].name}
                className={`focus-accent size-8 rounded-lg border-2 transition-transform active:scale-90 ${
                  accent === k ? 'border-white/70 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundImage: `linear-gradient(120deg, ${ACCENTS[k].from}, ${ACCENTS[k].to})` }}
              />
            ))}
          </div>
        </div>
        <Button
          variant="accent"
          disabled={!name.trim()}
          onClick={() => {
            addProfile(name, accent)
            setName('')
          }}
        >
          Add lifter
        </Button>
      </div>
    </div>
  )
}

function Transfer() {
  const { exportJSON, importJSON } = useStore()
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function flash(m: string) {
    setMsg(m)
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-ink-100">Move your data to another phone</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-400">
        Everything lives in this browser — nothing is uploaded anywhere, so there is no login and no account.
        Download the file, send it to yourself, and load it on the other device.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            const blob = new Blob([exportJSON()], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `iron-lifters-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
            flash('Downloaded.')
          }}
        >
          Download backup
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(exportJSON())
              flash('Copied to clipboard.')
            } catch {
              flash('Clipboard blocked — use Download instead.')
            }
          }}
        >
          Copy to clipboard
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          Load a backup
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const text = await file.text()
            flash(importJSON(text) ? 'Loaded.' : 'That file did not look right.')
            e.target.value = ''
          }}
        />
        {msg && <span className="self-center text-xs font-semibold text-[var(--accent-text)]">{msg}</span>}
      </div>
    </div>
  )
}

export default function Lifters() {
  const { profile, profiles, setActive, updateProfile, removeProfile } = useStore()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const targets = targetsFor(profile)
  const bench = resolvePR(profile, 'bench')
  const [nameDraft, setNameDraft] = useState(profile.name)
  const [bwDraft, setBwDraft] = useState(String(profile.bodyweight))

  useEffect(() => {
    setNameDraft(profile.name)
    setBwDraft(String(profile.bodyweight))
  }, [profile.id, profile.name, profile.bodyweight])

  const tested = (Object.keys(PR_LABEL) as PRKey[]).filter((k) => profile.prs[k]).length

  return (
    <div className="rise">
      <section className="mb-8">
        <Pill tone="accent">User management</Pill>
        <h1 className="display mt-2 text-4xl leading-[0.9] text-ink-100 sm:text-6xl">
          Whose <span className="accent-text-grad">numbers?</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-300">
          Every weight on the workout pages is a percentage of the PRs below. Keep them honest and the
          program runs itself. Anything you leave blank gets estimated from the lifts you did fill in.
        </p>
      </section>

      {/* Lifter cards */}
      <section className="mb-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => {
            const a = ACCENTS[p.accent] ?? ACCENTS.ember
            const active = p.id === profile.id
            const pbench = resolvePR(p, 'bench')
            return (
              <button
                key={p.id}
                onClick={() => setActive(p.id)}
                className={`focus-accent card relative overflow-hidden p-5 text-left transition-all ${
                  active ? 'ring-2' : 'hover:border-white/20'
                }`}
                style={active ? ({ '--tw-ring-color': a.ring } as React.CSSProperties) : undefined}
              >
                <div
                  className="absolute inset-x-0 top-0 h-0.5"
                  style={{ backgroundImage: `linear-gradient(90deg, ${a.from}, ${a.to})` }}
                />
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-11 place-items-center rounded-xl text-lg font-black text-black"
                    style={{ backgroundImage: `linear-gradient(120deg, ${a.from}, ${a.to})` }}
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold text-ink-100">{p.name}</div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                      {p.goal === 'bulk' ? 'Bulking' : 'Cutting'} · {p.bodyweight} {p.unit}
                    </div>
                  </div>
                  {active && (
                    <span className="ml-auto text-[10px] font-black uppercase tracking-[0.14em] text-[var(--accent-text)]">
                      Active
                    </span>
                  )}
                </div>
                <div className="num mt-4 flex gap-4 text-xs text-ink-400">
                  <span>
                    Bench{' '}
                    <span className="font-bold text-ink-200">
                      {Math.round(pbench.value)} {p.unit}
                    </span>
                  </span>
                  <span>
                    Squat{' '}
                    <span className="font-bold text-ink-200">
                      {Math.round(resolvePR(p, 'squat').value)} {p.unit}
                    </span>
                  </span>
                  <span>
                    Pull{' '}
                    <span className="font-bold text-ink-200">
                      {Math.round(resolvePR(p, 'deadlift').value)} {p.unit}
                    </span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mb-8">
        <AddLifter />
      </section>

      {/* Active profile settings */}
      <section className="mb-10">
        <SectionTitle
          kicker="Editing"
          title={`${profile.name}'s profile`}
          sub="Bodyweight drives your calorie and protein targets, and it is also what the pull-up loading is calculated from."
        />

        <div className="card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">Name</span>
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => updateProfile(profile.id, { name: nameDraft.trim() || profile.name })}
                className="focus-accent mt-1.5 w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold text-ink-100"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">
                Bodyweight ({profile.unit})
              </span>
              <input
                inputMode="decimal"
                value={bwDraft}
                onChange={(e) => setBwDraft(e.target.value)}
                onBlur={() => {
                  const n = Number.parseFloat(bwDraft)
                  if (Number.isFinite(n) && n > 0) updateProfile(profile.id, { bodyweight: n })
                  else setBwDraft(String(profile.bodyweight))
                }}
                className="num focus-accent mt-1.5 w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm font-bold text-ink-100"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">Goal</span>
              <div className="mt-1.5">
                <Segmented
                  value={profile.goal}
                  onChange={(goal) => updateProfile(profile.id, { goal })}
                  options={[
                    { value: 'bulk', label: 'Bulk' },
                    { value: 'cut', label: 'Cut' },
                  ]}
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">Units</span>
              <div className="mt-1.5">
                <Segmented
                  value={profile.unit}
                  onChange={(unit) => updateProfile(profile.id, { unit })}
                  options={[
                    { value: 'lb', label: 'lb' },
                    { value: 'kg', label: 'kg' },
                  ]}
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">Colour</span>
              <div className="mt-1.5 flex gap-1.5">
                {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => updateProfile(profile.id, { accent: k })}
                    title={ACCENTS[k].name}
                    aria-label={ACCENTS[k].name}
                    className={`focus-accent size-8 rounded-lg border-2 transition-transform active:scale-90 ${
                      profile.accent === k ? 'scale-110 border-white/70' : 'border-transparent'
                    }`}
                    style={{
                      backgroundImage: `linear-gradient(120deg, ${ACCENTS[k].from}, ${ACCENTS[k].to})`,
                    }}
                  />
                ))}
              </div>
            </div>

            {profiles.length > 1 && (
              <div className="ml-auto">
                {confirmDelete === profile.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-400">Delete {profile.name}?</span>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        removeProfile(profile.id)
                        setConfirmDelete(null)
                      }}
                    >
                      Yes, delete
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="danger" onClick={() => setConfirmDelete(profile.id)}>
                    Delete lifter
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Daily calories" value={targets.kcal.toLocaleString()} sub={profile.goal === 'bulk' ? 'Bulking' : 'Cutting'} accent />
          <Stat label="Daily protein" value={`${targets.protein}g`} />
          <Stat
            label="Bench 1RM"
            value={`${Math.round(bench.value)}`}
            sub={bench.entered ? 'Tested' : 'Estimated — go enter it'}
          />
          <Stat label="Lifts tested" value={`${tested} / 13`} sub="The rest are calculated" />
        </div>
      </section>

      {/* PRs */}
      <section className="mb-10">
        <SectionTitle
          kicker="The engine"
          title="Personal records"
          sub="One-rep maxes. Fill in what you know — anything blank is estimated from the lifts you did enter, and shown greyed out with an 'estimated' tag."
        />
        <div className="space-y-4">
          {PR_GROUPS.map((g) => (
            <div key={g.title} className="card overflow-hidden">
              <div className="border-b border-white/[0.07] bg-white/[0.02] px-4 py-3 sm:px-5">
                <h3 className="text-sm font-bold text-ink-100">{g.title}</h3>
                <p className="mt-0.5 text-[11px] text-ink-500">{g.note}</p>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {g.keys.map((k) => (
                  <PRRow key={k} prKey={k} profileId={profile.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <OneRepCalculator />
      </section>

      <section>
        <Transfer />
      </section>
    </div>
  )
}
