/**
 * Product mark: a loaded bar seen end-on. Drawn rather than an emoji so it
 * holds up at 26px in the header and at favicon size. Always brand crimson —
 * it is the one thing the active lifter colour does not retint.
 */
export function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="7" fill="var(--color-brand)" />
      <g stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
        {/* outer plates */}
        <path d="M9 10.5v11M23 10.5v11" />
        {/* inner collars */}
        <path d="M13.5 13v6M18.5 13v6" opacity="0.75" />
        {/* bar */}
        <path d="M13.5 16h5" />
      </g>
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark className="size-[26px] shrink-0" />
      <span className="text-[16px] font-700 leading-none tracking-[-0.035em] text-ink">Sexy Workouts</span>
    </span>
  )
}
