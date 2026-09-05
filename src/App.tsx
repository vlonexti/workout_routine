import { useEffect, useState } from 'react'
import { ACCENTS, useStore } from './lib/store'
import Workouts from './components/Workouts'
import Nutrition from './components/Nutrition'
import Lifters from './components/Lifters'

export type View = 'workouts' | 'bulk' | 'cut' | 'lifters'

const NAV: { id: View; label: string }[] = [
  { id: 'workouts', label: 'Workouts' },
  { id: 'bulk', label: 'Bulk' },
  { id: 'cut', label: 'Cut' },
  { id: 'lifters', label: 'Lifters' },
]

function SyncDot() {
  const { sync, syncError, cloudEnabled, refresh } = useStore()
  const map = {
    local: { color: '#a8a8b2', text: 'This device only' },
    connecting: { color: '#d97706', text: 'Syncing…' },
    synced: { color: '#16a34a', text: 'Saved for everyone' },
    offline: { color: '#dc2626', text: syncError ?? 'Cannot reach the database' },
  } as const
  const s = map[sync]
  return (
    <button
      onClick={() => cloudEnabled && refresh()}
      title={
        cloudEnabled
          ? `${s.text} — click to refresh`
          : 'No database connected yet. PRs save to this browser only.'
      }
      className="focus-ring hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-ink-500 transition-colors hover:bg-paper sm:inline-flex"
    >
      <span className="size-1.5 rounded-full" style={{ background: s.color }} />
      <span className="hidden lg:inline">{s.text}</span>
    </button>
  )
}

export default function App() {
  const { profile, profiles, setActive } = useStore()
  const [view, setView] = useState<View>('workouts')
  const [menu, setMenu] = useState(false)

  // The active lifter's colour drives every accent on the page.
  useEffect(() => {
    const a = ACCENTS[profile.accent] ?? ACCENTS.ember
    const r = document.documentElement.style
    r.setProperty('--accent', a.base)
    r.setProperty('--accent-soft', a.soft)
    r.setProperty('--accent-line', a.line)
  }, [profile.accent])

  useEffect(() => {
    window.scrollTo({ top: 0 })
    setMenu(false)
  }, [view])

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:px-6">
          <button
            onClick={() => setView('workouts')}
            className="focus-ring flex shrink-0 items-center gap-2 pr-1"
            title="Home"
          >
            <span
              className="grid size-7 place-items-center rounded-md text-white"
              style={{ background: 'var(--accent)' }}
            >
              <BarbellIcon />
            </span>
            <span className="h-display text-[15px] text-ink-900">Iron</span>
          </button>

          <nav className="ml-3 hidden items-center gap-0.5 md:flex">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`focus-ring relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === n.id ? 'text-ink-900' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {n.label}
                {view === n.id && (
                  <span
                    className="absolute inset-x-2.5 -bottom-[11px] h-0.5 rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <SyncDot />

            <div className="hidden items-center gap-0.5 rounded-lg border border-line bg-paper p-0.5 sm:flex">
              {profiles.slice(0, 3).map((p) => {
                const a = ACCENTS[p.accent] ?? ACCENTS.ember
                const active = p.id === profile.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setActive(p.id)}
                    title={`Switch to ${p.name}`}
                    className={`focus-ring flex items-center gap-1.5 rounded-[0.3125rem] py-1 pl-1 pr-2.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-white text-ink-900 shadow-[0_1px_2px_rgba(24,24,27,0.06)]'
                        : 'text-ink-500 hover:text-ink-900'
                    }`}
                  >
                    <span
                      className="grid size-5 place-items-center rounded text-[10px] font-bold text-white"
                      style={{ background: a.base }}
                    >
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    {p.name}
                  </button>
                )
              })}
              {profiles.length > 3 && (
                <button
                  onClick={() => setView('lifters')}
                  className="focus-ring rounded-[0.3125rem] px-2 py-1 text-xs font-semibold text-ink-500 hover:text-ink-900"
                >
                  +{profiles.length - 3}
                </button>
              )}
            </div>

            {/* Narrow screens: tap to cycle to the next lifter. */}
            <button
              onClick={() => {
                const i = profiles.findIndex((p) => p.id === profile.id)
                setActive(profiles[(i + 1) % profiles.length].id)
              }}
              title={`Lifting as ${profile.name} — tap to switch`}
              className="focus-ring flex items-center gap-1.5 rounded-lg border border-line bg-white py-1 pl-1 pr-2.5 text-xs font-semibold text-ink-900 sm:hidden"
            >
              <span
                className="grid size-5 place-items-center rounded text-[10px] font-bold text-white"
                style={{ background: (ACCENTS[profile.accent] ?? ACCENTS.ember).base }}
              >
                {profile.name.slice(0, 1).toUpperCase()}
              </span>
              {profile.name}
            </button>

            <button
              onClick={() => setMenu((m) => !m)}
              aria-label="Menu"
              aria-expanded={menu}
              className="focus-ring grid size-8 place-items-center rounded-lg border border-line bg-white text-ink-700 md:hidden"
            >
              {menu ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {menu && (
          <div className="border-t border-line bg-white px-4 py-3 md:hidden">
            <div className="grid grid-cols-2 gap-2">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setView(n.id)}
                  className={`focus-ring rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                    view === n.id
                      ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-line text-ink-700'
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pt-9">
        {view === 'workouts' && <Workouts />}
        {view === 'bulk' && <Nutrition goal="bulk" />}
        {view === 'cut' && <Nutrition goal="cut" />}
        {view === 'lifters' && <Lifters />}
      </main>

      <footer className="border-t border-line px-4 py-7 text-center sm:px-6">
        <p className="text-xs text-ink-400">
          Built for Steven &amp; Zach. Train hard, eat, sleep nine hours.
        </p>
        <p className="mt-1.5 text-[11px] text-ink-300">
          Not medical advice — if something hurts in a joint rather than a muscle, stop.
        </p>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV.map((n) => {
            const active = view === n.id
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className="focus-ring flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors"
                style={{ color: active ? 'var(--accent)' : 'var(--color-ink-400)' }}
              >
                <span
                  className="h-0.5 w-6 rounded-full"
                  style={{ background: active ? 'var(--accent)' : 'transparent' }}
                />
                {n.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function BarbellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
    </svg>
  )
}
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
