import type { ReactNode } from 'react'
import { useEffect, useId, useState } from 'react'

/* ------------------------------------------------------------------ */
/*  Button                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white border border-accent hover:bg-accent-hover hover:border-accent-hover active:bg-accent-hover',
  secondary:
    'bg-surface text-ink border border-rule hover:bg-sunken hover:border-rule-strong active:bg-sunken',
  ghost: 'bg-transparent text-ink-2 border border-transparent hover:bg-sunken hover:text-ink',
  destructive: 'bg-surface text-bad border border-rule hover:bg-bad-bg hover:border-bad/30',
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  className = '',
  title,
  type = 'button',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  className?: string
  title?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const sizes = {
    sm: 'h-7 px-2.5 text-[12px] rounded-[--radius-sm]',
    md: 'h-9 px-3.5 text-[13px] rounded-[--radius-md]',
  }
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`focus-ring inline-flex shrink-0 items-center justify-center gap-1.5 font-semibold whitespace-nowrap transition-colors duration-[--t-fast] disabled:pointer-events-none disabled:opacity-40 ${sizes[size]} ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Inputs                                                             */
/* ------------------------------------------------------------------ */

const FIELD_BASE =
  'h-9 w-full rounded-[--radius-md] border border-rule bg-surface px-2.5 text-[13px] text-ink transition-colors duration-[--t-fast] placeholder:text-ink-4 hover:border-rule-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:opacity-50'

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string
  hint?: string
  children: (id: string) => ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="t-label mb-1.5 block">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1 text-[11px] leading-snug text-ink-3">{hint}</p>}
    </div>
  )
}

export function TextInput({
  id,
  value,
  onChange,
  onCommit,
  placeholder,
  className = '',
  ariaLabel,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  onCommit?: (v: string) => void
  placeholder?: string
  className?: string
  ariaLabel?: string
}) {
  return (
    <input
      id={id}
      aria-label={ariaLabel}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onCommit?.(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className={`${FIELD_BASE} ${className}`}
    />
  )
}

/** Numeric entry for weights, reps and macros. Right-aligned, tabular. */
export function NumberInput({
  id,
  value,
  onChange,
  onCommit,
  placeholder,
  suffix,
  className = '',
  ariaLabel,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  onCommit?: (v: string) => void
  placeholder?: string
  suffix?: string
  className?: string
  ariaLabel?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        aria-label={ariaLabel}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        className={`mono ${FIELD_BASE} text-right font-medium ${suffix ? 'pr-8' : ''}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-ink-3">
          {suffix}
        </span>
      )}
    </div>
  )
}

export function Select({
  id,
  value,
  onChange,
  children,
  className = '',
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${FIELD_BASE} cursor-pointer ${className}`}
    >
      {children}
    </select>
  )
}

/* ------------------------------------------------------------------ */
/*  Toggles                                                            */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  className = '',
  ariaLabel,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  className?: string
  ariaLabel?: string
}) {
  const pad = size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-9 px-3 text-[13px]'
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex shrink-0 rounded-[--radius-md] border border-rule bg-sunken p-[3px] ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`focus-ring rounded-[--radius-sm] font-semibold transition-colors duration-[--t-fast] ${pad} ${
              active
                ? 'bg-surface text-ink shadow-[0_1px_1px_rgba(23,22,26,0.06)]'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Small display pieces                                               */
/* ------------------------------------------------------------------ */

/** Genuinely a status or tag — not used as generic decoration. */
export function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'bad'
}) {
  const tones = {
    neutral: 'border-rule bg-sunken text-ink-2',
    accent: 'border-accent-rule bg-accent-bg text-accent',
    good: 'border-good/25 bg-good-bg text-good',
    warn: 'border-warn/25 bg-warn-bg text-warn',
    bad: 'border-bad/25 bg-bad-bg text-bad',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-[1px] text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

/** Heading for a block of content. Optional right-hand slot for controls. */
export function SectionHead({
  title,
  meta,
  children,
  className = '',
}: {
  title: string
  meta?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={`mb-3 flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div>
        <h2 className="t-section">{title}</h2>
        {meta && <p className="t-meta mt-0.5">{meta}</p>}
      </div>
      {children}
    </div>
  )
}

/**
 * Horizontal run of figures separated by rules. Replaces the row of identical
 * stat cards — one strong number, one muted label, no boxes.
 */
export function FigureRow({
  items,
  className = '',
}: {
  items: { value: string; label: string }[]
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-3 sm:gap-x-8 ${className}`}>
      {items.map((it, i) => (
        <div key={it.label} className="flex items-center gap-6 sm:gap-8">
          {i > 0 && <span aria-hidden className="hidden h-7 w-px bg-rule sm:block" />}
          <div>
            <div className="mono text-[17px] font-600 leading-none text-ink">{it.value}</div>
            <div className="t-label mt-1.5">{it.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Save indicator                                                     */
/* ------------------------------------------------------------------ */

export function SaveIndicator({
  state,
  error,
}: {
  state: 'idle' | 'saving' | 'saved' | 'error'
  error?: string | null
}) {
  // Hold the row's width steady so the header does not jump as text changes.
  if (state === 'idle') return null
  if (state === 'error') {
    return (
      <span
        title={error ?? undefined}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-bad"
      >
        <span className="size-1.5 rounded-full bg-bad" />
        Not saved
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition-opacity duration-[--t-base]"
      aria-live="polite"
    >
      <span
        className={`size-1.5 rounded-full ${state === 'saved' ? 'bg-good' : 'bg-ink-4'}`}
      />
      {state === 'saved' ? 'Saved' : 'Saving…'}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Macro bar                                                          */
/* ------------------------------------------------------------------ */

const MACRO_COLORS = {
  protein: 'var(--color-macro-protein)',
  carbs: 'var(--color-macro-carbs)',
  fat: 'var(--color-macro-fat)',
}

export function MacroBar({
  protein,
  carbs,
  fat,
  showLegend = true,
}: {
  protein: number
  carbs: number
  fat: number
  showLegend?: boolean
}) {
  const seg = [
    { kcal: protein * 4, color: MACRO_COLORS.protein, label: 'Protein', grams: protein },
    { kcal: carbs * 4, color: MACRO_COLORS.carbs, label: 'Carbs', grams: carbs },
    { kcal: fat * 9, color: MACRO_COLORS.fat, label: 'Fat', grams: fat },
  ]
  const total = Math.max(1, seg.reduce((a, s) => a + s.kcal, 0))
  return (
    <div>
      <div className="flex h-1 w-full overflow-hidden rounded-full bg-sunken">
        {seg.map((s) => (
          <div key={s.label} style={{ width: `${(s.kcal / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {seg.map((s) => (
            <span key={s.label} className="inline-flex items-baseline gap-1.5 text-[12px]">
              <span className="size-1.5 translate-y-[-1px] rounded-full" style={{ background: s.color }} />
              <span className="text-ink-3">{s.label}</span>
              <span className="mono font-medium text-ink">{s.grams}g</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Expand / collapse chevron                                          */
/* ------------------------------------------------------------------ */

export function Chevron({ open, className = '' }: { open: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`size-3 shrink-0 transition-transform duration-[--t-fast] ${open ? 'rotate-180' : ''} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

/** Keeps a text input responsive while only committing on blur/Enter. */
export function useDraft(source: string) {
  const [draft, setDraft] = useState(source)
  useEffect(() => setDraft(source), [source])
  return [draft, setDraft] as const
}
