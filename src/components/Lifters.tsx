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

  useEffect(() => {
    setDraft(entered ? String(entered) : '')
  }, [profileId, entered])

  return (
    <div className="flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink-900">{PR_LABEL[prKey]}</span>
          {!resolved.entered && (
            <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-px text-[10px] font-semibold text-amber-700">
              Estimated
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-ink-400">{PR_HINT[prKey]}</p>
      </div>
      <div className="relative shrink-0">
        <input
          inputMode="decimal"
          value={draft}
          placeholder={String(Math.round(resolved.value))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => {
            const n = Number.parseFloat(e.target.value)
            setPR(profileId, prKey, Number.isFinite(n) && n > 0 ? n : undefined)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          aria-label={`${PR_LABEL[prKey]} one rep max`}
          className={`num focus-ring w-[100px] rounded-lg border border-line bg-white py-1.5 pl-2.5 pr-8 text-right text-sm font-semibold ${
            resolved.entered ? 'text-ink-900' : 'text-ink-400 placeholder:text-ink-300'
          }`}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-ink-400">
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

  const field =
    'focus-ring mt-1.5 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm font-semibold text-ink-900'

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-ink-900">Do not know your 1-rep max?</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">
        You do not need to test a true max — that is risky and unnecessary. Take a set you know you
        can do, put it in here, and use the estimate.
      </p>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="block">
          <span className="label">Lift</span>
          <select value={lift} onChange={(e) => setLift(e.target.value as PRKey)} className={field}>
            {(Object.keys(PR_LABEL) as PRKey[]).map((k) => (
              <option key={k} value={k}>
                {PR_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Weight ({profile.unit})</span>
          <input
            inputMode="decimal"
            value={weight}
            placeholder="185"
            onChange={(e) => setWeight(e.target.value)}
            className={`num ${field}`}
          />
        </label>
        <label className="block">
          <span className="label">Reps</span>
          <input
            inputMode="numeric"
            value={reps}
            placeholder="5"
            onChange={(e) => setReps(e.target.value)}
            className={`num ${field}`}
          />
        </label>
      </div>

      <div className="panel mt-3.5 flex flex-wrap items-center gap-3 p-3.5">
        <div>
          <div className="label">Estimated 1RM</div>
          <div className="num text-2xl font-semibold leading-tight" style={{ color: 'var(--accent)' }}>
            {est || '—'} {est ? <span className="text-sm text-ink-400">{profile.unit}</span> : null}
          </div>
        </div>
        <Button variant="accent" className="ml-auto" disabled={!est} onClick={() => setPR(profile.id, lift, est)}>
          Save as {PR_LABEL[lift]} PR
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-ink-400">
        Most accurate between 3 and 8 reps. Above 10 it starts to overestimate.
      </p>
    </div>
  )
}

function AddLifter() {
  const { addProfile, profiles } = useStore()
  const [name, setName] = useState('')
  const used = new Set(profiles.map((p) => p.accent))
  const free = (Object.keys(ACCENTS) as AccentKey[]).find((k) => !used.has(k)) ?? 'volt'
  const [accent, setAccent] = useState<AccentKey>(free)

  const submit = () => {
    if (!name.trim()) return
    addProfile(name, accent)
    setName('')
  }

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-ink-900">Add a lifter</h3>
      <p className="mt-1 text-xs text-ink-500">
        Everyone gets their own PRs, bodyweight, goal and colour.
      </p>
      <div className="mt-3.5 flex flex-wrap items-end gap-3">
        <label className="min-w-[170px] flex-1">
          <span className="label">Name</span>
          <input
            value={name}
            placeholder="Who's lifting?"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="focus-ring mt-1.5 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm font-semibold text-ink-900"
          />
        </label>
        <div>
          <span className="label">Colour</span>
          <div className="mt-1.5 flex gap-1.5">
            {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setAccent(k)}
                title={ACCENTS[k].name}
                aria-label={ACCENTS[k].name}
                className={`focus-ring size-7 rounded-md border-2 transition-transform ${
                  accent === k ? 'border-ink-900' : 'border-transparent'
                }`}
                style={{ background: ACCENTS[k].base }}
              />
            ))}
          </div>
        </div>
        <Button variant="accent" disabled={!name.trim()} onClick={submit}>
          Add lifter
        </Button>
      </div>
    </div>
  )
}

function DataPanel() {
  const { exportJSON, importJSON, cloudEnabled, sync, syncError, refresh } = useStore()
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900">Where your data lives</h3>
        {cloudEnabled ? (
          <Pill tone={sync === 'synced' ? 'good' : sync === 'offline' ? 'warn' : 'muted'}>
            {sync === 'synced'
              ? 'Shared database'
              : sync === 'offline'
                ? 'Offline — saved locally'
                : 'Connecting…'}
          </Pill>
        ) : (
          <Pill tone="warn">This device only</Pill>
        )}
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
        {cloudEnabled ? (
          <>
            Lifters, PRs and completed sets save to a shared Supabase database, so Steven&apos;s
            phone and Zach&apos;s laptop see the same numbers. If the connection drops, everything
            keeps working from this browser and syncs when it comes back.
          </>
        ) : (
          <>
            No database is connected yet, so everything saves to this browser only — your PRs will
            not show up on another phone. Follow <span className="font-medium text-ink-700">supabase/schema.sql</span>{' '}
            and paste your project URL and anon key into{' '}
            <span className="font-medium text-ink-700">src/lib/cloud-config.ts</span> to turn on
            sharing.
          </>
        )}
      </p>

      {syncError && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-800">
          {syncError}
        </p>
      )}

      <div className="mt-3.5 flex flex-wrap gap-2">
        {cloudEnabled && (
          <Button size="sm" onClick={refresh}>
            Refresh from database
          </Button>
        )}
        <Button
          size="sm"
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
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
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
        {msg && <span className="self-center text-xs font-medium text-ink-500">{msg}</span>}
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
  const field =
    'focus-ring mt-1.5 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm font-semibold text-ink-900'

  return (
    <div className="enter">
      <section className="mb-7">
        <Pill tone="accent">User management</Pill>
        <h1 className="h-display mt-2 text-3xl text-ink-900 sm:text-4xl">Lifters</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
          Every weight on the workout pages is a percentage of the PRs below. Anything you leave
          blank is estimated from the lifts you did fill in.
        </p>
      </section>

      <section className="mb-6">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => {
            const a = ACCENTS[p.accent] ?? ACCENTS.ember
            const active = p.id === profile.id
            return (
              <button
                key={p.id}
                onClick={() => setActive(p.id)}
                className="card focus-ring p-4 text-left transition-colors"
                style={active ? { borderColor: a.base, background: a.soft } : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="grid size-9 place-items-center rounded-lg text-sm font-bold text-white"
                    style={{ background: a.base }}
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink-900">{p.name}</div>
                    <div className="text-[11px] text-ink-500">
                      {p.goal === 'bulk' ? 'Bulking' : 'Cutting'} · {p.bodyweight} {p.unit}
                    </div>
                  </div>
                  {active && (
                    <span
                      className="ml-auto text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: a.base }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <div className="num mt-3 flex gap-3 text-[11px] text-ink-500">
                  {(['bench', 'squat', 'deadlift'] as PRKey[]).map((k) => (
                    <span key={k}>
                      {k === 'deadlift' ? 'Pull' : k === 'bench' ? 'Bench' : 'Squat'}{' '}
                      <span className="font-semibold text-ink-700">
                        {Math.round(resolvePR(p, k).value)}
                      </span>
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mb-6">
        <AddLifter />
      </section>

      <section className="mb-9">
        <SectionTitle
          kicker="Editing"
          title={`${profile.name}'s profile`}
          sub="Bodyweight drives your calorie and protein targets, and the pull-up loading."
        />

        <div className="card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Name</span>
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => updateProfile(profile.id, { name: nameDraft.trim() || profile.name })}
                className={field}
              />
            </label>
            <label className="block">
              <span className="label">Bodyweight ({profile.unit})</span>
              <input
                inputMode="decimal"
                value={bwDraft}
                onChange={(e) => setBwDraft(e.target.value)}
                onBlur={() => {
                  const n = Number.parseFloat(bwDraft)
                  if (Number.isFinite(n) && n > 0) updateProfile(profile.id, { bodyweight: n })
                  else setBwDraft(String(profile.bodyweight))
                }}
                className={`num ${field}`}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-5">
            <div>
              <span className="label">Goal</span>
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
              <span className="label">Units</span>
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
              <span className="label">Colour</span>
              <div className="mt-1.5 flex gap-1.5">
                {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => updateProfile(profile.id, { accent: k })}
                    title={ACCENTS[k].name}
                    aria-label={ACCENTS[k].name}
                    className={`focus-ring size-7 rounded-md border-2 ${
                      profile.accent === k ? 'border-ink-900' : 'border-transparent'
                    }`}
                    style={{ background: ACCENTS[k].base }}
                  />
                ))}
              </div>
            </div>

            {profiles.length > 1 && (
              <div className="ml-auto">
                {confirmDelete === profile.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-500">Delete {profile.name}?</span>
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

        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat
            label="Daily calories"
            value={targets.kcal.toLocaleString()}
            sub={profile.goal === 'bulk' ? 'Bulking' : 'Cutting'}
            accent
          />
          <Stat label="Daily protein" value={`${targets.protein}g`} />
          <Stat
            label="Bench 1RM"
            value={String(Math.round(bench.value))}
            sub={bench.entered ? 'Tested' : 'Estimated'}
          />
          <Stat label="Lifts tested" value={`${tested} / 13`} sub="The rest are calculated" />
        </div>
      </section>

      <section className="mb-9">
        <SectionTitle
          kicker="The engine"
          title="Personal records"
          sub="One-rep maxes. Fill in what you know; blanks get estimated and are tagged as such."
        />
        <div className="space-y-3">
          {PR_GROUPS.map((g) => (
            <div key={g.title} className="card overflow-hidden">
              <div className="border-b border-line bg-paper px-4 py-2.5">
                <h3 className="text-sm font-semibold text-ink-900">{g.title}</h3>
                <p className="mt-0.5 text-[11px] text-ink-400">{g.note}</p>
              </div>
              <div className="divide-y divide-line">
                {g.keys.map((k) => (
                  <PRRow key={k} prKey={k} profileId={profile.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <OneRepCalculator />
      </section>

      <section>
        <DataPanel />
      </section>
    </div>
  )
}
