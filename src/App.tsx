import { useEffect, useState } from 'react'
import { ACCENTS, useStore } from './lib/store'
import Workouts from './components/Workouts'
import Nutrition from './components/Nutrition'
import Lifters from './components/Lifters'

export type View = 'workouts' | 'bulk' | 'cut' | 'lifters'

const NAV: { id: View; label: string; hint: string }[] = [
  { id: 'workouts', label: 'Workouts', hint: 'The 5-day split' },
  { id: 'bulk', label: 'Bulk', hint: 'Eat to grow' },
  { id: 'cut', label: 'Cut', hint: 'Eat to shred' },
  { id: 'lifters', label: 'Lifters', hint: 'PRs & profiles' },
]

export default function App() {
  const { profile, profiles, setActive } = useStore()
  const [view, setView] = useState<View>('workouts')
  const [menu, setMenu] = useState(false)

  // Push the active lifter's colour into CSS custom properties so the whole
  // page — glows, gradients, focus rings — retints when you switch people.
  useEffect(() => {
    const a = ACCENTS[profile.accent] ?? ACCENTS.ember
    const r = document.documentElement.style
    r.setProperty('--accent-from', a.from)
    r.setProperty('--accent-to', a.to)
    r.setProperty('--accent-ring', a.ring)
    r.setProperty('--accent-text', a.text)
  }, [profile.accent])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    setMenu(false)
  }, [view])

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <button
            onClick={() => setView('workouts')}
            className="focus-accent group flex shrink-0 items-center gap-2.5"
            title="Home"
          >
            <span className="accent-grad grid size-9 place-items-center rounded-xl text-black shadow-lg shadow-black/50">
              <BarbellIcon />
            </span>
            <span className="display text-xl tracking-wide text-ink-100">Iron</span>
          </button>

          <nav className="ml-2 hidden flex-1 items-center gap-1 md:flex">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                title={n.hint}
                className={`focus-accent relative rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                  view === n.id ? 'text-ink-100' : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                {n.label}
                {view === n.id && (
                  <span className="accent-grad absolute inset-x-3 -bottom-px h-0.5 rounded-full" />
                )}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Lifter switcher — the most-used control on the site */}
            <div className="hidden items-center gap-1 rounded-xl border border-white/10 bg-black/30 p-1 sm:flex">
              {profiles.slice(0, 4).map((p) => {
                const a = ACCENTS[p.accent] ?? ACCENTS.ember
                const active = p.id === profile.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setActive(p.id)}
                    title={`Switch to ${p.name}`}
                    className={`focus-accent flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-3 text-xs font-bold transition-all ${
                      active ? 'bg-white/10 text-ink-100' : 'text-ink-400 hover:text-ink-200'
                    }`}
                  >
                    <span
                      className="grid size-6 place-items-center rounded-md text-[10px] font-black text-black"
                      style={{ backgroundImage: `linear-gradient(120deg, ${a.from}, ${a.to})` }}
                    >
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    {p.name}
                  </button>
                )
              })}
              {profiles.length > 4 && (
                <button
                  onClick={() => setView('lifters')}
                  className="focus-accent rounded-lg px-2 py-1.5 text-xs font-bold text-ink-400 hover:text-ink-200"
                >
                  +{profiles.length - 4}
                </button>
              )}
            </div>

            {/* Narrow screens: one tap cycles to the next lifter. */}
            <button
              onClick={() => {
                const i = profiles.findIndex((p) => p.id === profile.id)
                setActive(profiles[(i + 1) % profiles.length].id)
              }}
              title={`Lifting as ${profile.name} — tap to switch`}
              className="focus-accent flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] py-1.5 pl-1.5 pr-3 text-xs font-bold text-ink-100 sm:hidden"
            >
              <span
                className="grid size-7 place-items-center rounded-lg text-[11px] font-black text-black"
                style={{
                  backgroundImage: `linear-gradient(120deg, ${(ACCENTS[profile.accent] ?? ACCENTS.ember).from}, ${(ACCENTS[profile.accent] ?? ACCENTS.ember).to})`,
                }}
              >
                {profile.name.slice(0, 1).toUpperCase()}
              </span>
              {profile.name}
            </button>

            <button
              onClick={() => setMenu((m) => !m)}
              aria-label="Menu"
              aria-expanded={menu}
              className="focus-accent grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-ink-200 md:hidden"
            >
              {menu ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {menu && (
          <div className="border-t border-white/[0.07] bg-ink-950/95 px-4 pb-4 pt-2 md:hidden">
            <div className="grid grid-cols-2 gap-2">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setView(n.id)}
                  className={`focus-accent rounded-xl border p-3 text-left transition-colors ${
                    view === n.id
                      ? 'border-[var(--accent-ring)]/50 bg-white/[0.07]'
                      : 'border-white/10 bg-white/[0.02]'
                  }`}
                >
                  <div className="text-sm font-bold text-ink-100">{n.label}</div>
                  <div className="text-[11px] text-ink-400">{n.hint}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {profiles.map((p) => {
                const a = ACCENTS[p.accent] ?? ACCENTS.ember
                const active = p.id === profile.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setActive(p.id)}
                    className={`focus-accent flex items-center gap-2 rounded-lg border py-1.5 pl-1.5 pr-3 text-xs font-bold ${
                      active ? 'border-white/25 bg-white/10 text-ink-100' : 'border-white/10 text-ink-400'
                    }`}
                  >
                    <span
                      className="grid size-6 place-items-center rounded-md text-[10px] font-black text-black"
                      style={{ backgroundImage: `linear-gradient(120deg, ${a.from}, ${a.to})` }}
                    >
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    {p.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10">
        {view === 'workouts' && <Workouts />}
        {view === 'bulk' && <Nutrition goal="bulk" />}
        {view === 'cut' && <Nutrition goal="cut" />}
        {view === 'lifters' && <Lifters />}
      </main>

      <footer className="border-t border-white/[0.07] px-4 py-8 text-center sm:px-6">
        <p className="text-xs text-ink-500">
          Built for Steven &amp; Zach. Everything saves to this device — hit{' '}
          <button
            onClick={() => setView('lifters')}
            className="focus-accent font-semibold text-ink-300 underline decoration-dotted underline-offset-2 hover:text-ink-100"
          >
            Export
          </button>{' '}
          on the Lifters page to move your PRs to another phone.
        </p>
        <p className="mt-2 text-[11px] text-ink-600">
          Train hard, eat, sleep 9 hours. Not medical advice — if something hurts in a joint, stop.
        </p>
      </footer>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/90 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`focus-accent flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                view === n.id ? 'text-[var(--accent-text)]' : 'text-ink-500'
              }`}
            >
              <span className={`h-0.5 w-7 rounded-full ${view === n.id ? 'accent-grad' : 'bg-transparent'}`} />
              {n.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function BarbellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
    </svg>
  )
}
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
