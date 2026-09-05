import { useEffect, useState } from 'react'
import { ACCENTS, useStore } from './lib/store'
import Workouts from './components/Workouts'
import Nutrition from './components/Nutrition'
import Lifters from './components/Lifters'
import { EmptyLifters, ErrorScreen, LoadingScreen, SetupScreen } from './components/states'
import { Mark } from './components/Wordmark'
import { SaveIndicator } from './components/ui'

export type View = 'workouts' | 'bulk' | 'cut' | 'lifters'

const NAV: { id: View; label: string }[] = [
  { id: 'workouts', label: 'Workouts' },
  { id: 'bulk', label: 'Bulk' },
  { id: 'cut', label: 'Cut' },
  { id: 'lifters', label: 'Lifters' },
]

/** Compact identity control. The active lifter reads as selected without a box. */
function LifterSwitch({ onManage }: { onManage: () => void }) {
  const { lifters, lifter, setActive } = useStore()
  const overflow = lifters.length > 3
  const shown = overflow ? lifters.filter((l) => l.id === lifter.id).concat(lifters.filter((l) => l.id !== lifter.id)).slice(0, 2) : lifters

  return (
    <div className="flex items-center gap-0.5">
      {shown.map((l) => {
        const a = ACCENTS[l.accent] ?? ACCENTS.ember
        const active = l.id === lifter.id
        return (
          <button
            key={l.id}
            onClick={() => setActive(l.id)}
            title={`Switch to ${l.name}`}
            aria-pressed={active}
            className={`focus-ring flex h-9 items-center gap-1.5 rounded-[--radius-md] px-2 text-[13px] font-semibold transition-colors duration-[--t-fast] ${
              active ? 'bg-sunken text-ink' : 'text-ink-3 hover:bg-sunken hover:text-ink-2'
            }`}
          >
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full transition-opacity duration-[--t-fast]"
              style={{ background: a.base, opacity: active ? 1 : 0.4 }}
            />
            {/* Always name the active lifter; collapse the rest to a dot on
                narrow screens so the row still fits. */}
            <span className={active ? '' : 'hidden sm:inline'}>{l.name}</span>
          </button>
        )
      })}
      {overflow && (
        <button
          onClick={onManage}
          title="All lifters"
          className="focus-ring h-8 rounded-[--radius-md] px-2 text-[13px] font-semibold text-ink-3 transition-colors duration-[--t-fast] hover:bg-sunken hover:text-ink"
        >
          +{lifters.length - shown.length}
        </button>
      )}
    </div>
  )
}

export default function App() {
  const { status, error, reload, lifters, lifter, saveState, saveError, addLifter } = useStore()
  const [view, setView] = useState<View>('workouts')
  const [menu, setMenu] = useState(false)

  // The active lifter tints identity marks only — never the whole page.
  useEffect(() => {
    if (!lifter) return
    const a = ACCENTS[lifter.accent] ?? ACCENTS.ember
    const r = document.documentElement.style
    r.setProperty('--lifter', a.base)
    r.setProperty('--lifter-bg', a.soft)
    r.setProperty('--lifter-rule', a.line)
  }, [lifter])

  useEffect(() => {
    window.scrollTo({ top: 0 })
    setMenu(false)
  }, [view])

  if (status === 'unconfigured') return <SetupScreen />

  const header = (
    <header className="sticky top-0 z-40 border-b border-rule bg-canvas/92 backdrop-blur-[6px]">
      <div className="shell flex h-14 items-center gap-2">
        <button
          onClick={() => setView('workouts')}
          className="focus-ring flex shrink-0 items-center gap-2 rounded-[--radius-sm] pr-1"
          title="IRON"
        >
          <Mark className="size-[26px]" />
          <span className="text-[17px] font-700 leading-none tracking-[-0.045em] text-ink">IRON</span>
        </button>

        <nav className="ml-4 hidden items-center md:flex" aria-label="Sections">
          {NAV.map((n) => {
            const active = view === n.id
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                aria-current={active ? 'page' : undefined}
                className={`focus-ring relative h-14 px-3 text-[13px] font-semibold transition-colors duration-[--t-fast] ${
                  active ? 'text-ink' : 'text-ink-3 hover:text-ink'
                }`}
              >
                {n.label}
                {active && <span className="absolute inset-x-2.5 bottom-0 h-[2px] bg-accent" />}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SaveIndicator state={saveState} error={saveError} />
          {status === 'ready' && lifter && <LifterSwitch onManage={() => setView('lifters')} />}
          <button
            onClick={() => setMenu((m) => !m)}
            aria-label="Menu"
            aria-expanded={menu}
            className="focus-ring grid size-8 place-items-center rounded-[--radius-md] border border-rule bg-surface text-ink-2 md:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menu && (
        <nav className="border-t border-rule bg-surface md:hidden" aria-label="Sections">
          <div className="shell grid grid-cols-2 gap-1.5 py-3">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`focus-ring h-10 rounded-[--radius-md] border px-3 text-left text-[13px] font-semibold transition-colors duration-[--t-fast] ${
                  view === n.id ? 'border-accent-rule bg-accent-bg text-accent' : 'border-rule text-ink-2'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  )

  let body
  if (status === 'loading') body = <LoadingScreen />
  else if (status === 'error') body = <ErrorScreen message={error ?? 'Unknown error'} onRetry={reload} />
  else if (!lifters.length) body = <EmptyLifters onAdd={() => addLifter('Lifter', 'ember')} />
  else
    body = (
      <main className="shell py-7 pb-24 sm:py-9 md:pb-16">
        {view === 'workouts' && <Workouts />}
        {view === 'bulk' && <Nutrition goal="bulk" />}
        {view === 'cut' && <Nutrition goal="cut" />}
        {view === 'lifters' && <Lifters />}
      </main>
    )

  return (
    <div className="flex min-h-dvh flex-col">
      {header}
      <div className="flex-1">{body}</div>

      <footer className="border-t border-rule">
        <div className="shell flex flex-wrap items-center justify-between gap-2 py-5">
          <p className="t-meta">Five-day strength program · Steven &amp; Zach</p>
          <p className="text-[12px] text-ink-4">
            Stop if something hurts in a joint rather than a muscle.
          </p>
        </div>
      </footer>

      {/* Mobile tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface md:hidden"
        aria-label="Sections"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4 pb-[env(safe-area-inset-bottom)]">
          {NAV.map((n) => {
            const active = view === n.id
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                aria-current={active ? 'page' : undefined}
                className={`focus-ring relative flex h-12 items-center justify-center text-[12px] font-semibold transition-colors duration-[--t-fast] ${
                  active ? 'text-accent' : 'text-ink-3'
                }`}
              >
                {active && <span className="absolute inset-x-5 top-0 h-[2px] bg-accent" />}
                {n.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
