import { useMemo, useState } from 'react'
import { GROCERY, PLANS, RECIPES, SUPPLEMENTS } from '../data/nutrition'
import { useStore } from '../lib/store'
import { targetsFor } from '../lib/calc'
import type { Goal, Recipe } from '../lib/types'
import { Button, MacroBar, Pill, SectionTitle, Stat } from './ui'

const SLOT_HUE: Record<Recipe['slot'], string> = {
  Breakfast: '#fbbf24',
  'Pre-lift': '#38bdf8',
  'Post-lift': '#ff6a2b',
  Dinner: '#a3e635',
  Snack: '#a855f7',
  'Before bed': '#64748b',
}

function MealCard({ recipe }: { recipe: Recipe }) {
  const [open, setOpen] = useState(false)
  const hue = SLOT_HUE[recipe.slot]
  return (
    <article className="card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="focus-accent w-full p-5 text-left"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em]"
                style={{ background: `${hue}20`, color: hue, border: `1px solid ${hue}40` }}
              >
                {recipe.slot}
              </span>
              <span className="num text-[11px] font-semibold text-ink-500">{recipe.time}</span>
            </div>
            <h3 className="text-lg font-bold leading-tight text-ink-100">{recipe.name}</h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-400">{recipe.blurb}</p>
          </div>

          <div className="shrink-0 text-right">
            <div className="num text-3xl font-bold leading-none text-ink-100">{recipe.kcal}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">kcal</div>
            <div className="num mt-2 text-sm font-bold text-sky-300">{recipe.protein}g protein</div>
          </div>
        </div>

        <div className="mt-4">
          <MacroBar protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} />
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-400">
          {open ? 'Hide recipe' : 'Show recipe'}
          <svg
            viewBox="0 0 24 24"
            className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="grid gap-6 border-t border-white/[0.07] bg-black/25 p-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">
              What you need
            </h4>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink-200">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full" style={{ background: hue }} />
                  {ing}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">
              How to make it
            </h4>
            <ol className="space-y-3">
              {recipe.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="num mt-px shrink-0 text-xs font-bold text-ink-600">{i + 1}</span>
                  <span className="text-sm leading-relaxed text-ink-300">{s}</span>
                </li>
              ))}
            </ol>
            {recipe.swap && (
              <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">Swap</div>
                <p className="mt-1 text-xs leading-relaxed text-ink-300">{recipe.swap}</p>
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
  const unit = profile.unit

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
    <div className="rise">
      <section className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Pill tone="accent">{profile.name}</Pill>
          <Pill tone="muted">
            {profile.bodyweight} {unit} bodyweight
          </Pill>
          {isActiveGoal ? (
            <Pill tone="accent">Current goal</Pill>
          ) : (
            <Button size="sm" variant="outline" onClick={() => updateProfile(profile.id, { goal })}>
              Set as {profile.name}&apos;s goal
            </Button>
          )}
        </div>
        <h1 className="display text-4xl leading-[0.9] text-ink-100 sm:text-6xl">
          {goal === 'bulk' ? (
            <>
              Eat to <span className="accent-text-grad">grow.</span>
            </>
          ) : (
            <>
              Eat to <span className="accent-text-grad">shred.</span>
            </>
          )}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-300">{plan.blurb}</p>
      </section>

      <section className="mb-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Daily calories" value={targets.kcal.toLocaleString()} sub={plan.tagline} accent />
          <Stat label="Protein" value={`${targets.protein}g`} sub="Hit this every single day" />
          <Stat label="Carbs" value={`${targets.carbs}g`} sub="Most of them around training" />
          <Stat label="Fat" value={`${targets.fat}g`} sub="Do not go lower than this" />
        </div>

        <div className="card mt-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-sm font-bold text-ink-100">This plan, all in</h3>
            <div className="num text-sm text-ink-400">
              <span className="font-bold text-ink-100">{total.kcal.toLocaleString()}</span> kcal ·{' '}
              <span className="font-bold text-sky-300">{total.protein}g</span> protein
            </div>
          </div>
          <div className="mt-3">
            <MacroBar protein={total.protein} carbs={total.carbs} fat={total.fat} />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-ink-400">
            {Math.abs(gap) < 200 ? (
              <>
                That lands within {Math.abs(gap)} calories of your target — close enough. Adjust portion
                sizes rather than adding whole meals.
              </>
            ) : gap < 0 ? (
              <>
                That is <span className="font-bold text-amber-300">{Math.abs(gap)} calories short</span> of
                your target.{' '}
                {goal === 'bulk'
                  ? 'Add the Mass Shake below, or a second scoop of peanut butter at breakfast.'
                  : 'Add a second Greek yogurt cup, or another 4 oz of chicken at dinner.'}
              </>
            ) : (
              <>
                That is <span className="font-bold text-amber-300">{gap} calories over</span> your target.
                Trim the bedtime meal first, or drop the honey and cheese.
              </>
            )}{' '}
            {proteinGap >= 0 ? (
              <span className="text-emerald-300/90">Protein is covered with {proteinGap}g to spare.</span>
            ) : (
              <span className="text-amber-300">
                You are {Math.abs(proteinGap)}g short on protein — add a scoop of whey.
              </span>
            )}
          </p>
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle
          kicker="The day"
          title="What you actually eat"
          sub="Breakfast at home, school lunch in the middle, chicken after the weight room, real dinner at night. Nothing here takes more than ten minutes."
        />
        <div className="space-y-3">
          {meals.map((m) => (
            <MealCard key={m.id} recipe={m} />
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle
          kicker="11:30am"
          title="School lunch"
          sub="You are not packing a lunch. Here is how to build the best tray available from whatever the line is serving."
        />
        <div className="card p-5 sm:p-6">
          <ul className="space-y-3.5">
            {plan.schoolLunch.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="accent-grad mt-1 size-1.5 shrink-0 rounded-full" />
                <span className="text-sm leading-relaxed text-ink-200">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {extras.length > 0 && (
        <section className="mb-10">
          <SectionTitle
            kicker="Only if you need them"
            title="Add these when the scale stalls"
            sub="Do not start here. Run the four meals above for two weeks first, then reach for these if you are not gaining."
          />
          <div className="space-y-3">
            {extras.map((m) => (
              <MealCard key={m.id} recipe={m} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <SectionTitle kicker="Non-negotiable" title={`${plan.title} rules`} />
        <div className="grid gap-3 sm:grid-cols-2">
          {plan.rules.map((r, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start gap-3">
                <span className="num mt-0.5 shrink-0 text-sm font-bold text-ink-600">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-ink-100">{r.title}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{r.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle
          kicker="Sunday, 20 minutes"
          title="Grocery list"
          sub="One shop a week. Buy this and you never have to think about what to eat again."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {GROCERY.map((g) => (
            <div key={g.section} className="card p-5">
              <h4 className="text-sm font-bold text-ink-100">{g.section}</h4>
              <p className="mt-1 text-[11px] leading-snug text-ink-500">{g.where}</p>
              <ul className="mt-3 space-y-2">
                {g.items.map((it, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-ink-300">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-600" />
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
          sub="There are two that work, two that help a little, and a whole industry of things that do nothing."
        />
        <div className="card divide-y divide-white/[0.06]">
          {SUPPLEMENTS.map((s) => (
            <div key={s.name} className="grid gap-2 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-ink-100">{s.name}</h4>
                  <span
                    className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${
                      s.verdict === 'Skip it'
                        ? 'border-red-500/25 bg-red-500/10 text-red-300/90'
                        : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300/90'
                    }`}
                  >
                    {s.verdict}
                  </span>
                </div>
                <p className="num mt-1 text-[11px] text-ink-500">{s.dose}</p>
              </div>
              <p className="text-sm leading-relaxed text-ink-400">{s.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
