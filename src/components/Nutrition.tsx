import { useMemo, useState } from 'react'
import { GROCERY, PLANS, RECIPES, SUPPLEMENTS } from '../data/nutrition'
import { useStore } from '../lib/store'
import { targetsFor } from '../lib/calc'
import type { Goal, Recipe } from '../lib/types'
import { Button, MacroBar, Pill, SectionTitle, Stat } from './ui'

const SLOT_STYLE: Record<Recipe['slot'], string> = {
  Breakfast: 'border-amber-200 bg-amber-50 text-amber-700',
  'Pre-lift': 'border-sky-200 bg-sky-50 text-sky-700',
  'Post-lift': 'border-orange-200 bg-orange-50 text-orange-700',
  Dinner: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Snack: 'border-violet-200 bg-violet-50 text-violet-700',
  'Before bed': 'border-line bg-paper text-ink-500',
}

function MealCard({ recipe }: { recipe: Recipe }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="focus-ring w-full p-4 text-left">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span
                className={`rounded border px-1.5 py-px text-[10px] font-semibold ${SLOT_STYLE[recipe.slot]}`}
              >
                {recipe.slot}
              </span>
              <span className="num text-[11px] text-ink-400">{recipe.time}</span>
            </div>
            <h3 className="text-[15px] font-semibold leading-tight text-ink-900">{recipe.name}</h3>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-500">{recipe.blurb}</p>
          </div>

          <div className="shrink-0 text-right">
            <div className="num text-xl font-semibold leading-none text-ink-900">{recipe.kcal}</div>
            <div className="label mt-1">kcal</div>
            <div className="num mt-1.5 text-xs font-semibold text-blue-600">{recipe.protein}g protein</div>
          </div>
        </div>

        <div className="mt-3.5">
          <MacroBar protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} />
        </div>

        <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-ink-500">
          {open ? 'Hide recipe' : 'Show recipe'}
          <svg
            viewBox="0 0 24 24"
            className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="grid gap-5 border-t border-line bg-paper p-4 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div>
            <h4 className="label mb-2.5">What you need</h4>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-700">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-line-strong" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="label mb-2.5">How to make it</h4>
            <ol className="space-y-2.5">
              {recipe.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="num shrink-0 text-xs font-medium text-ink-300">{i + 1}</span>
                  <span className="text-sm leading-relaxed text-ink-700">{s}</span>
                </li>
              ))}
            </ol>
            {recipe.swap && (
              <div className="mt-3.5 rounded-lg border border-line bg-white p-3">
                <div className="label">Swap</div>
                <p className="mt-1 text-xs leading-relaxed text-ink-700">{recipe.swap}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

export default function Nutrition({ goal }: { goal: Goal }) {
  const { profile, updateProfile } = useStore()
  const plan = PLANS[goal]
  const targets = targetsFor(profile, goal)

  const meals = useMemo(
    () => plan.meals.map((id) => RECIPES.find((r) => r.id === id)!).filter(Boolean),
    [plan],
  )
  const extras = useMemo(
    () => plan.extras.map((id) => RECIPES.find((r) => r.id === id)!).filter(Boolean),
    [plan],
  )

  const total = meals.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )

  const gap = total.kcal - targets.kcal
  const proteinGap = total.protein - targets.protein
  const isActiveGoal = profile.goal === goal

  return (
    <div className="enter">
      <section className="mb-7">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Pill tone="accent">{profile.name}</Pill>
          <Pill tone="muted">
            {profile.bodyweight} {profile.unit}
          </Pill>
          {isActiveGoal ? (
            <Pill tone="good">Current goal</Pill>
          ) : (
            <Button size="sm" variant="outline" onClick={() => updateProfile(profile.id, { goal })}>
              Set as {profile.name}&apos;s goal
            </Button>
          )}
        </div>
        <h1 className="h-display text-3xl text-ink-900 sm:text-4xl">
          {goal === 'bulk' ? 'Eat to grow.' : 'Eat to shred.'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">{plan.blurb}</p>
      </section>

      <section className="mb-9">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Daily calories" value={targets.kcal.toLocaleString()} sub={plan.tagline} accent />
          <Stat label="Protein" value={`${targets.protein}g`} sub="Hit this every day" />
          <Stat label="Carbs" value={`${targets.carbs}g`} sub="Most of them around training" />
          <Stat label="Fat" value={`${targets.fat}g`} sub="Do not go lower" />
        </div>

        <div className="card mt-2.5 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink-900">This plan, all in</h3>
            <div className="num text-sm text-ink-500">
              <span className="font-semibold text-ink-900">{total.kcal.toLocaleString()}</span> kcal ·{' '}
              <span className="font-semibold text-blue-600">{total.protein}g</span> protein
            </div>
          </div>
          <div className="mt-3">
            <MacroBar protein={total.protein} carbs={total.carbs} fat={total.fat} />
          </div>
          <p className="mt-3.5 text-xs leading-relaxed text-ink-500">
            {Math.abs(gap) < 200 ? (
              <>Within {Math.abs(gap)} calories of your target — close enough. Adjust portions rather than adding meals.</>
            ) : gap < 0 ? (
              <>
                <span className="font-semibold text-amber-700">{Math.abs(gap)} calories short</span> of
                target.{' '}
                {goal === 'bulk'
                  ? 'Add the Mass Shake below, or a second scoop of peanut butter at breakfast.'
                  : 'Add another Greek yogurt cup, or 4 more oz of chicken at dinner.'}
              </>
            ) : (
              <>
                <span className="font-semibold text-amber-700">{gap} calories over</span> target. Trim
                the bedtime meal first, or drop the honey and cheese.
              </>
            )}{' '}
            {proteinGap >= 0 ? (
              <span className="text-emerald-700">Protein is covered with {proteinGap}g to spare.</span>
            ) : (
              <span className="text-amber-700">
                {Math.abs(proteinGap)}g short on protein — add a scoop of whey.
              </span>
            )}
          </p>
        </div>
      </section>

      <section className="mb-9">
        <SectionTitle
          kicker="The day"
          title="What you actually eat"
          sub="Breakfast at home, school lunch in the middle, chicken after the weight room, real dinner at night. Nothing takes more than ten minutes."
        />
        <div className="space-y-2.5">
          {meals.map((m) => (
            <MealCard key={m.id} recipe={m} />
          ))}
        </div>
      </section>

      <section className="mb-9">
        <SectionTitle
          kicker="11:30am"
          title="School lunch"
          sub="You are not packing a lunch, so here is how to build the best tray out of whatever the line is serving."
        />
        <div className="card p-5">
          <ul className="space-y-3">
            {plan.schoolLunch.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span
                  className="mt-1.5 size-1 shrink-0 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
                <span className="text-sm leading-relaxed text-ink-700">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {extras.length > 0 && (
        <section className="mb-9">
          <SectionTitle
            kicker="Only if you need them"
            title="Add these when the scale stalls"
            sub="Do not start here. Run the four meals above for two weeks first."
          />
          <div className="space-y-2.5">
            {extras.map((m) => (
              <MealCard key={m.id} recipe={m} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-9">
        <SectionTitle kicker="Non-negotiable" title={`${plan.title} rules`} />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {plan.rules.map((r, i) => (
            <div key={i} className="card flex gap-3 p-4">
              <span className="num shrink-0 text-xs font-medium text-ink-300">{i + 1}</span>
              <div>
                <h4 className="text-sm font-semibold text-ink-900">{r.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">{r.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-9">
        <SectionTitle
          kicker="Sunday, 20 minutes"
          title="Grocery list"
          sub="One shop a week and you never have to think about what to eat again."
        />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {GROCERY.map((g) => (
            <div key={g.section} className="card p-4">
              <h4 className="text-sm font-semibold text-ink-900">{g.section}</h4>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-400">{g.where}</p>
              <ul className="mt-2.5 space-y-1.5">
                {g.items.map((it, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-700">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-line-strong" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          kicker="Save your money"
          title="Supplements"
          sub="Two work, two help a little, and a whole industry does nothing."
        />
        <div className="card divide-y divide-line">
          {SUPPLEMENTS.map((s) => (
            <div key={s.name} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-ink-900">{s.name}</h4>
                  <span
                    className={`rounded border px-1.5 py-px text-[10px] font-semibold ${
                      s.verdict === 'Skip it'
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {s.verdict}
                  </span>
                </div>
                <p className="num mt-1 text-[11px] text-ink-400">{s.dose}</p>
              </div>
              <p className="text-sm leading-relaxed text-ink-500">{s.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
