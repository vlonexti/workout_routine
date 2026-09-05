# Sexy Workouts

A five-day strength program and training log for Steven and Zach, plus the food that goes with it.

Live at **[justloofy.dev](https://justloofy.dev)**.

## What it does

- **Workouts** — Mon chest + shoulders, Tue back + biceps, Wed core *or* legs, Thu chest volume + delts, Fri back volume + arms. Weekends off. Upper-body focus: side delts, rear delts, lats, upper chest, arms, forearms and core carry the volume. Sessions run 17-24 working sets, roughly 60-90 minutes.
- **Percentage-based loading.** Every working weight is a share of that lifter's one-rep max. Enter a bench number and the whole program fills in; blanks are derived from the lifts you did enter and flagged as estimated.
- **A four-week wave.** Weeks 1–3 climb, week 4 deloads. The multiplier scales main lifts and light accessories alike.
- **Wednesday rotation.** Odd training weeks are Core + Forearms, even weeks are Legs + Core, so legs run once a fortnight. Derived from the training week, which already persists per lifter.
- **Bulk and Cut** — calorie and protein targets computed from bodyweight and goal, a full day of meals with macros and recipes, a grocery list and a supplement rundown.
- **Lifters** — per-athlete PRs with change-over-time, a starting weight, monthly weigh-ins with a trend line, goal, units and colour.
- **Phases** — each bulk or cut is recorded with its start date and weight. Switching goal closes the running phase and opens a new one, so the history survives. Bulk and Cut pages show where you are in the current phase and a hedged estimate of how long is left, calculated only from weigh-ins that actually exist.

Everything is per lifter, including the training week. Steven can be in week 3 while Zach is in week 1.

## Where the data lives

Postgres, via Supabase. Open the site on a different phone, laptop or browser and the same numbers load.

The **only** thing kept on the device is `iron.activeLifter` — which profile this browser had open last. It is a convenience, not data; clear it and nothing is lost.

### Connecting it

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), Run. It is idempotent, so it is safe to run again after changes.
3. **Project Settings → API** — copy the **Project URL** and the **anon public** key.
4. Paste both into the top of [`src/lib/supabase-config.ts`](src/lib/supabase-config.ts), commit and push.

Until that is done the app shows a setup screen rather than pretending to work. There is no local-only mode by design.

For local development you can use a `.env.local` instead of editing the config file:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Migration from the old device-only version

Anything saved in the browser before the database existed (`iron.v1` / `iron.v2`) is imported automatically the first time Sexy Workouts connects to an **empty** project — lifters, PRs and bodyweight. It only runs against an empty database, so it can never overwrite real rows, and it marks itself done afterwards.

`supabase/schema.sql` separately migrates the earlier `profiles` + `app_settings` tables into the normalised layout, leaving the old tables in place rather than dropping them.

### Security tradeoff

There is no login, so the browser talks to Postgres as the anonymous role and the RLS policies allow anyone with the URL to read and write. Fine for a few friends; not fine if the link spreads, because someone could wipe the history. The anon key being public is normal — it ships in every Supabase web app. The permissive policy is the thing to change: gate writes on a shared secret, or turn on Supabase Auth.

## Data model

| Table | Contents |
| --- | --- |
| `lifters` | One row per athlete: name, bodyweight, unit, goal, colour, training week, Wednesday variant, optional nutrition target overrides. |
| `pr_entries` | Append-only. Newest row per lift is the current PR; the older rows are what make the `+10 lb` change honest. |
| `bodyweight_entries` | Monthly weigh-ins, unique on `(lifter_id, logged_on)`. Adding a second in the same month updates the existing row. |
| `phases` | One row per bulk or cut: start date, start weight, and the end date/weight once it closes. The open phase is the one with a null `end_date`; a partial unique index allows only one per lifter. |

Everything cascades from `lifters` on delete. Writes are optimistic: the UI moves first, and if Postgres rejects the change the previous state is restored and the header says **Not saved** rather than silently losing it.

## Running it locally

```bash
npm install
npm run dev
```

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build
```

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages. `public/CNAME` pins the custom domain.

**Settings → Pages → Source must be "GitHub Actions."** Two traps, both of which look identical in the browser (blank page, correct tab title):

- **Source left on "Deploy from a branch."** GitHub then runs its own publisher, which copies the repo verbatim with no build step, and races this workflow. Tell them apart by fetching `/README.md`: a 200 means you are getting the raw repo, a 404 means you are getting the build.
- **Changing the Source does not republish.** It only affects the next deploy, so push a commit afterwards.

## Editing the program

The fitness logic is data, not layout:

- [`src/data/program.ts`](src/data/program.ts) — the week. Each exercise has `pr` (which max it loads off), `pct`, `sets`, `reps`, `rest` and its cues. Change a `pct` and every lifter's numbers move.
- [`src/data/nutrition.ts`](src/data/nutrition.ts) — recipes, plans, grocery list, supplements.
- [`src/lib/calc.ts`](src/lib/calc.ts) — PR derivation ratios, the weekly wave, plate math, calorie targets.

Session length is computed rather than written down: `sessionMinutes()` sums warm-up minutes, working sets, rest and a per-exercise transition allowance. Add an exercise and the duration updates itself.

## Design

Tokens live in [`src/index.css`](src/index.css) — surfaces, text, rules, accent, status colours, radii and timings. Components reference tokens only; there are no loose hex values outside that file. Content is capped at 1120px, radii are 4–8px, and the one soft shadow in the system is on the segmented-control thumb.

Each lifter has a colour, used to identify whose data is on screen — a dot, an initial, a thin edge. It never repaints the page.

## Stack

React 19, TypeScript, Tailwind CSS 4, Vite. Supabase is reached over its REST API with plain `fetch` rather than the SDK — four tables is not worth 50 kB of client. No router: `base: './'` keeps the build working on the custom domain and on `github.io/workout_routine/` alike.
