import type { ReactNode } from 'react'

export function Pill({
  children,
  tone = 'default',
  className = '',
}: {
  children: ReactNode
  tone?: 'default' | 'accent' | 'muted' | 'good' | 'warn'
  className?: string
}) {
  const tones = {
    default: 'border-line bg-white text-ink-700',
    accent:
      'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]',
    muted: 'border-line bg-paper text-ink-500',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-700',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone]} ${className}`}
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
    <div className="card p-4">
      <div className="label">{label}</div>
      <div
        className={`num mt-1.5 text-2xl font-semibold ${accent ? 'text-[var(--accent)]' : 'text-ink-900'}`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs leading-snug text-ink-500">{sub}</div>}
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
    <div className="mb-4">
      {kicker && <div className="label mb-1.5">{kicker}</div>}
      <h2 className="h-display text-xl text-ink-900 sm:text-2xl">{title}</h2>
      {sub && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">{sub}</p>}
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
    'focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40'
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-3.5 py-2 text-sm' }
  const variants = {
    accent: 'bg-[var(--accent)] text-white hover:brightness-[1.08]',
    ghost: 'border border-line bg-white text-ink-900 hover:bg-paper',
    outline: 'border border-line bg-transparent text-ink-500 hover:text-ink-900 hover:bg-white',
    danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
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
      className={`inline-flex rounded-lg border border-line bg-paper p-0.5 ${className}`}
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
            className={`focus-ring rounded-[0.3125rem] px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? 'bg-white text-ink-900 shadow-[0_1px_2px_rgba(24,24,27,0.06)]'
                : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

const MACRO = {
  protein: '#2563eb',
  carbs: '#16a34a',
  fat: '#d97706',
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
  const seg = [
    { kcal: protein * 4, color: MACRO.protein, label: 'protein', grams: protein },
    { kcal: carbs * 4, color: MACRO.carbs, label: 'carbs', grams: carbs },
    { kcal: fat * 9, color: MACRO.fat, label: 'fat', grams: fat },
  ]
  const total = Math.max(1, seg.reduce((a, s) => a + s.kcal, 0))
  return (
    <div>
      <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
        {seg.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.kcal / total) * 100}%`, background: s.color }}
            className="first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>
      {!compact && (
        <div className="num mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-500">
          {seg.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <i className="size-1.5 rounded-full" style={{ background: s.color }} />
              {s.grams}g {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
