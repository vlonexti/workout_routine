import { Button } from './ui'
import { Wordmark } from './Wordmark'

/** Page-level skeleton shown while the first read from Postgres is in flight. */
export function LoadingScreen() {
  return (
    <div className="shell py-10" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-8 w-56" />
      <div className="skeleton mt-3 h-4 w-80" />
      <div className="mt-8 flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="skeleton h-16 flex-1" />
        ))}
      </div>
      <div className="mt-8 space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-[74px] w-full" />
        ))}
      </div>
    </div>
  )
}

export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="shell flex min-h-[60dvh] items-center justify-center py-10">
      <div className="panel max-w-lg p-6 sm:p-8">
        <span className="t-label text-bad">Database error</span>
        <h1 className="t-page mt-2 text-[22px] sm:text-[26px]">Could not load your data</h1>
        <p className="t-body mt-3">{message}</p>
        <p className="t-meta mt-3">
          Nothing has been lost — this is a read failure, so your saved training data is still in
          Postgres.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Shown when no Supabase credentials are compiled in. This is a setup state,
 * not a supported mode — the app has no local fallback by design.
 */
export function SetupScreen() {
  const steps: { title: string; body: string }[] = [
    {
      title: 'Create a Supabase project',
      body: 'supabase.com — the free tier is more than enough for a few lifters.',
    },
    {
      title: 'Run the schema',
      body: 'SQL Editor → New query → paste all of supabase/schema.sql → Run. It creates the tables and seeds Steven and Zach.',
    },
    {
      title: 'Copy the two keys',
      body: 'Project Settings → API → Project URL, and the key labelled "anon public".',
    },
    {
      title: 'Paste and push',
      body: 'Put both into src/lib/supabase-config.ts, commit, push. GitHub Actions redeploys on its own.',
    },
  ]

  return (
    <div className="shell flex min-h-[70dvh] items-center justify-center py-10">
      <div className="w-full max-w-xl">
        <Wordmark className="mb-6" />
        <span className="t-label">Setup required</span>
        <h1 className="t-page mt-2">Connect the database</h1>
        <p className="t-body mt-3 max-w-lg">
          IRON keeps every lifter, PR and logged set in Postgres so the same numbers show up on any
          phone or laptop. It needs the connection details before it can run.
        </p>

        <ol className="mt-7 border-t border-rule">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4 border-b border-rule py-3.5">
              <span className="mono mt-px w-5 shrink-0 text-[13px] font-medium text-ink-4">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="t-item">{s.title}</div>
                <p className="t-meta mt-0.5">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="t-meta mt-5">
          Anything saved on this device before the database existed is imported automatically the
          first time IRON connects to an empty project.
        </p>
      </div>
    </div>
  )
}

/** No lifters in the database yet. */
export function EmptyLifters({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="shell flex min-h-[60dvh] items-center justify-center py-10">
      <div className="max-w-md text-center">
        <h1 className="t-page">No lifters yet</h1>
        <p className="t-body mt-3">
          Add someone to start tracking PRs, weights and sessions. Everything saves to the shared
          database.
        </p>
        <div className="mt-5 flex justify-center">
          <Button variant="primary" onClick={onAdd}>
            Add the first lifter
          </Button>
        </div>
      </div>
    </div>
  )
}
