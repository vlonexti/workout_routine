# IRON

A five-day strength and hypertrophy program for Steven and Zach, plus the food that makes it work.

Live at **[justloofy.dev](https://justloofy.dev)**.

## What it does

- **Workouts** — Mon chest (heavy), Tue back (heavy), Wed legs *or* arms, Thu chest (volume), Fri back (volume) + arms. Weekends off. Every session is programmed to land around 2h 20m including rest and talking.
- **Every weight is a percentage of your PRs.** Enter one bench number and the whole program fills in; anything you leave blank is estimated from the lifts you did enter and flagged as such.
- **A 4-week wave.** Weeks 1–3 climb, week 4 deloads. The week selector rescales every number on the page.
- **Bulk and Cut** — calorie and protein targets from your bodyweight, a full day of meals with macros and recipes, a grocery list, and an honest read on supplements.
- **Lifters** — add people, edit PRs, estimate a 1RM from a set you've actually done.

## Connecting the database

Out of the box the site saves to the browser it's open in. To have everyone share one set of lifters, PRs and completed sets:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql), and run it. It creates the three tables, the access policies, and seeds Steven and Zach.
3. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.
4. Paste both into the top of [`src/lib/cloud-config.ts`](src/lib/cloud-config.ts).
5. Commit and push. The site redeploys and the dot in the header turns green.

The header shows the connection state at all times: grey "This device only", amber "Syncing…", green "Saved for everyone", red if it can't reach the database. Writes are optimistic — if the connection drops mid-session you keep training against the local copy, and the next successful write or refresh brings it back in line.

### About the security tradeoff

There's no login, which is what you asked for, so the site talks to Supabase as the anonymous role. The row-level security policies in `schema.sql` therefore allow anyone who has the URL to read and write. That's fine for a few friends. It does mean that if the link spreads, someone could edit or delete your PRs.

The anon key itself being public is normal and not the issue — it ships in every Supabase web app. The permissive policy is the thing to change if it ever matters. Two options, in order of effort: gate writes on a shared secret passed as a header, or turn on Supabase Auth with a magic link. Say the word and I'll wire either one up.

## Data model

| Table | What's in it |
| --- | --- |
| `profiles` | One row per lifter: name, bodyweight, unit, goal, colour, and PRs as JSON. |
| `app_settings` | One row, `shared` — the current training week and whether Wednesday is legs or arms. |

Which lifter is selected is deliberately **not** synced — that's per-device, so Steven's phone and Zach's phone can each stay on their own profile.

The site doesn't track individual sets. Rest times are printed on each exercise and that's it; there are no checkboxes and no countdown to babysit.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build
```

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages. `public/CNAME` pins the custom domain to `justloofy.dev`.

**One-time setup:** go to **Settings → Pages** and set **Source** to **GitHub Actions**. This can't be automated — the workflow's built-in token is allowed to manage an existing Pages site but not to create one. Until it's done, the deploy fails at the `configure-pages` step.

DNS for `justloofy.dev` already points at the GitHub Pages apex IPs (`185.199.108–111.153`), so nothing needs changing at the registrar.

## Editing the program

Everything is data, not layout:

- [`src/data/program.ts`](src/data/program.ts) — the week. Each exercise has `pr` (which max it loads off), `pct`, `sets`, `reps`, `rest`, plus form cues. Change a `pct` and every lifter's numbers move.
- [`src/data/nutrition.ts`](src/data/nutrition.ts) — recipes, meal plans, grocery list, supplements.
- [`src/lib/calc.ts`](src/lib/calc.ts) — PR derivation ratios, the weekly wave, plate math, calorie targets.

Session length is computed, not hardcoded: `sessionMinutes()` adds up warm-up minutes, working sets, rest, and a fixed transition allowance per exercise. Add an exercise and the "Time" stat updates on its own.

## Stack

React 19, TypeScript, Tailwind CSS 4, Vite. Supabase is reached over plain `fetch` against its REST API rather than the SDK — the whole surface is three tables, which isn't worth 50 kB of client. No router: `base: './'` keeps the build working on the custom domain and on `github.io/workout_routine/` alike.
