import type { ReactNode } from 'react'

export function Pill({
  children,
  tone = 'default',
  className = '',
}: {
  children: ReactNode
  tone?: 'default' | 'accent' | 'muted' | 'warn'
  className?: string
}) {
  const tones = {
    default: 'bg-white/[0.06] text-ink-200 border-white/10',
    accent: 'text-[var(--accent-text)] border-[color-mix(in_oklab,var(--accent-from)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent-from)_12%,transparent)]',
    muted: 'bg-white/[0.03] text-ink-400 border-white/[0.06]',
    warn: 'bg-amber-400/10 text-amber-300/90 border-amber-400/25',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

export function Stat({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: ReactNode
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">{label}</div>
      <div
        className={`num mt-2 text-2xl font-bold sm:text-3xl ${accent ? 'accent-text-grad' : 'text-ink-100'}`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs leading-snug text-ink-400">{sub}</div>}
    </div>
  )
}

export function SectionTitle({
  kicker,
  title,
  sub,
}: {
  kicker?: string
  title: string
  sub?: string
}) {
  return (
    <div className="mb-5">
      {kicker && (
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-text)]">
          {kicker}
        </div>
      )}
      <h2 className="display text-2xl text-ink-100 sm:text-3xl">{title}</h2>
      {sub && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300">{sub}</p>}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'ghost',
  size = 'md',
  className = '',
  title,
  type = 'button',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'accent' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md'
  className?: string
  title?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const base =
    'focus-accent inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm' }
  const variants = {
    accent: 'accent-grad text-black shadow-lg shadow-black/40 hover:brightness-110',
    ghost: 'bg-white/[0.06] text-ink-100 hover:bg-white/[0.11] border border-white/10',
    outline: 'border border-white/15 text-ink-300 hover:text-ink-100 hover:border-white/30',
    danger: 'border border-red-500/30 text-red-300/90 hover:bg-red-500/10 hover:text-red-200',
  }
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = '',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div
      className={`inline-flex rounded-xl border border-white/10 bg-black/30 p-1 ${className}`}
      role="tablist"
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`focus-accent rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
              active ? 'accent-grad text-black shadow' : 'text-ink-400 hover:text-ink-100'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function MacroBar({
  protein,
  carbs,
  fat,
  compact = false,
}: {
  protein: number
  carbs: number
  fat: number
  compact?: boolean
}) {
  const pc = protein * 4
  const cc = carbs * 4
  const fc = fat * 9
  const total = Math.max(1, pc + cc + fc)
  const seg = [
    { w: (pc / total) * 100, color: '#38bdf8', label: 'P', grams: protein },
    { w: (cc / total) * 100, color: '#a3e635', label: 'C', grams: carbs },
    { w: (fc / total) * 100, color: '#fbbf24', label: 'F', grams: fat },
  ]
  return (
    <div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
        {seg.map((s) => (
          <div key={s.label} style={{ width: `${s.w}%`, background: s.color }} />
        ))}
      </div>
      {!compact && (
        <div className="num mt-2 flex gap-3 text-[11px] text-ink-400">
          {seg.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <i className="size-1.5 rounded-full" style={{ background: s.color }} />
              {s.grams}g {s.label === 'P' ? 'protein' : s.label === 'C' ? 'carbs' : 'fat'}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
