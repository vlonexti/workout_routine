# IRON

A five-day strength and hypertrophy program for Steven and Zach, plus the food that makes it work.

Live at **[justloofy.dev](https://justloofy.dev)**.

## What it does

- **Workouts** — Mon chest (heavy), Tue back (heavy), Wed legs *or* arms, Thu chest (volume), Fri back (volume) + arms. Weekends off. Every session is programmed to land around 2h 20m including rest and talking.
- **Every weight is a percentage of your PRs.** Enter one bench number and the whole program fills in; anything you leave blank is estimated from the lifts you did enter and flagged as such.
- **A 4-week wave.** Weeks 1-3 climb, week 4 deloads. The week selector at the top of the Workouts page rescales every number on the page.
- **Rest timers.** Tap a set when you finish it and the timer starts, beeps and vibrates when rest is over.
- **Bulk and Cut** — calorie and protein targets from your bodyweight, a full day of meals with macros and recipes, a grocery list, and an honest read on supplements.
- **Lifters** — add people, edit PRs, estimate a 1RM from a set you've actually done, and back your data up to a file.

## Where the data lives

In your browser's `localStorage`. No login, no account, no server. That means:

- Your PRs stay on the device you entered them on.
- Use **Download backup** on the Lifters page and **Load a backup** on the other device to move between phone and laptop.
- Clearing your browser's site data will wipe it, so take a backup occasionally.

If you ever want shared, synced data across everyone, the whole persistence layer is one file — [`src/lib/store.tsx`](src/lib/store.tsx) — and swapping `localStorage` for Supabase means changing `load()` and the save effect there. Nothing else in the app touches storage.

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

One-time repo setup (Settings → Pages): set **Source** to **GitHub Actions**.

## Editing the program

Everything is data, not layout:

- [`src/data/program.ts`](src/data/program.ts) — the week. Each exercise has `pr` (which max it loads off), `pct`, `sets`, `reps`, `rest`, plus form cues. Change a `pct` and every lifter's numbers move.
- [`src/data/nutrition.ts`](src/data/nutrition.ts) — recipes, meal plans, grocery list, supplements.
- [`src/lib/calc.ts`](src/lib/calc.ts) — PR derivation ratios, the weekly wave, plate math, calorie targets.

Session length is computed, not hardcoded: `sessionMinutes()` adds up warm-up minutes, working sets, rest, and a fixed transition allowance per exercise. Add an exercise and the "Time" stat updates on its own.

## Stack

React 19, TypeScript, Tailwind CSS 4, Vite. No router and no backend — `base: './'` in the Vite config keeps the build working on the custom domain and on `github.io/workout_routine/` alike.
