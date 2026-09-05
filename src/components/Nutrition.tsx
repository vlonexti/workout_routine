import { useMemo, useState } from 'react'
import { GROCERY, PLANS, RECIPES, SUPPLEMENTS } from '../data/nutrition'
import { useStore } from '../lib/store'
import { targetsFor } from '../lib/calc'
import { PHASE_LABEL, formatDate, phasePosition, phaseProgress, signedWeight } from '../lib/progress'
import type { Goal, Recipe } from '../lib/types'
import { Button, Chevron, MacroBar, Tag } from './ui'

const SLOT_ORDER: Recipe['slot'][] = [
  'Breakfast',
  'Pre-lift',
  'Post-lift',
  'Dinner',
  'Snack',
  'Before bed',
]

function MealRow({ recipe }: { recipe: Recipe }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-rule-soft">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="focus-ring flex w-full flex-wrap items-start gap-x-4 gap-y-1.5 py-3.5 text-left"
      >
        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="t-label">{recipe.slot}</span>
            <span className="mono text-[11.5px] text-ink-4">{recipe.time}</span>
          </div>
          <h3 className="t-item mt-0.5">{recipe.name}</h3>
          <p className="t-meta mt-0.5 max-w-xl">{recipe.blurb}</p>
        </div>

        <div className="flex shrink-0 items-baseline gap-4 sm:gap-6">
          <div className="text-right">
            <div className="mono text-[16px] font-600 leading-none text-ink">{recipe.kcal}</div>
            <div className="t-label mt-1">kcal</div>
          </div>
          <div className="mono hidden text-right text-[12px] leading-relaxed text-ink-2 sm:block">
            <div>{recipe.protein}p</div>
            <div className="text-ink-3">
              {recipe.carbs}c · {recipe.fat}f
            </div>
          </div>
          <Chevron open={open} className="mt-1.5 text-ink-3" />
        </div>
      </button>

      {open && (
        <div className="grid gap-x-8 gap-y-5 pb-5 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div>
            <h4 className="t-label mb-2">Ingredients</h4>
            <ul>
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="border-b border-rule-soft py-1.5 text-[13px] text-ink-2">
                  {ing}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="t-label mb-2">Method</h4>
            <ol>
              {recipe.steps.map((s, i) => (
                <li key={i} className="flex gap-3 border-b border-rule-soft py-1.5">
                  <span className="mono w-3.5 shrink-0 text-[12px] text-ink-4">{i + 1}</span>
                  <span className="text-[13px] leading-relaxed text-ink-2">{s}</span>
                </li>
              ))}
            </ol>
            {recipe.swap && (
              <p className="t-meta mt-2.5">
                <span className="font-semibold text-ink-2">Swap: </span>
                {recipe.swap}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Nutrition({ goal }: { goal: Goal }) {
  const [confirmSwitch, setConfirmSwitch] = useState(false)
  const { lifter, setGoal, currentPhase, bodyweightHistory } = useStore()
  const plan = PLANS[goal]
  const targets = targetsFor(lifter, goal)

  // Only describe the phase on the page that matches the lifter's actual goal.
  const phase = currentPhase(lifter.id)
  const progress =
    phase && phase.type === goal ? phaseProgress(lifter, phase, bodyweightHistory(lifter.id)) : null

  const meals = useMemo(
    () =>
      plan.meals
        .map((id) => RECIPES.find((r) => r.id === id)!)
        .filter(Boolean)
        .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)),
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
  const isActive = lifter.goal === goal

  return (
    <div className="enter">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="t-page">{goal === 'bulk' ? 'Eat to grow.' : 'Eat to shred.'}</h1>
          <p className="t-body mt-1.5 max-w-lg">{plan.blurb}</p>
        </div>
        <div className="flex items-center gap-2.5">
          {isActive ? (
            <Tag tone="good">Current goal</Tag>
          ) : confirmSwitch ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="t-meta">
                End {lifter.name}&apos;s {lifter.goal} and begin a {goal}?
              </span>
              <Button size="sm" variant="primary" onClick={() => { setGoal(goal); setConfirmSwitch(false) }}>
                Start {goal}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmSwitch(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setConfirmSwitch(true)}>
              Switch to {goal}
            </Button>
          )}
        </div>
      </div>

      {/* Calories dominate; macros are supporting detail. */}
      <section className="mt-7 border-y border-rule py-6">
        <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
          <div className="shrink-0">
            <div className="mono text-[44px] font-600 leading-none tracking-[-0.03em] text-ink sm:text-[56px]">
              {targets.kcal.toLocaleString()}
            </div>
            <div className="t-label mt-2">kcal / day</div>
            <p className="t-meta mt-2 max-w-[240px]">
              {plan.tagline} · at {lifter.bodyweight} {lifter.unit}
            </p>
          </div>

          <div className="min-w-[240px] flex-1">
            <div className="grid grid-cols-3 gap-x-4 border-b border-rule-soft pb-3">
              {[
                { label: 'Protein', value: targets.protein },
                { label: 'Carbs', value: targets.carbs },
                { label: 'Fat', value: targets.fat },
              ].map((m) => (
                <div key={m.label}>
                  <div className="mono text-[20px] font-600 leading-none text-ink">{m.value}g</div>
                  <div className="t-label mt-1.5">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3.5">
              <MacroBar
                protein={targets.protein}
                carbs={targets.carbs}
                fat={targets.fat}
                showLegend={false}
              />
            </div>
            <p className="t-meta mt-2.5">
              Water {targets.waterOz} oz · protein is the floor, hit it every day.
            </p>
          </div>
        </div>

        {progress && (
          <div className="mt-6 border-t border-rule-soft pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="t-label">{PHASE_LABEL[progress.phase.type]} progress</span>
              <span className="t-meta mono">
                Started {formatDate(progress.phase.startDate)} · {phasePosition(progress)}
              </span>
            </div>
            <p className="mono mt-1.5 text-[13px] text-ink-2">
              {progress.startWeight} → {progress.currentWeight} {lifter.unit}
              <span className="text-ink-4"> · </span>
              <span className={progress.change > 0 ? 'text-good' : progress.change < 0 ? 'text-ink' : 'text-ink-3'}>
                {signedWeight(progress.change, lifter.unit)}
              </span>
              {progress.perWeek != null && (
                <>
                  <span className="text-ink-4"> · </span>
                  {signedWeight(progress.perWeek, lifter.unit)}/wk average
                </>
              )}
            </p>
            <p className="t-meta mt-1">
              {progress.advice}
              {progress.reviewMonth && progress.perWeek != null && (
                <> Review around {progress.reviewMonth}.</>
              )}
            </p>
          </div>
        )}
      </section>

      {/* Meal plan is the main content */}
      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-2">
          <h2 className="t-section">Daily plan</h2>
          <span className="mono text-[12.5px] text-ink-3">
            {total.kcal.toLocaleString()} kcal · {total.protein}g protein
          </span>
        </div>
        <div>
          {meals.map((m) => (
            <MealRow key={m.id} recipe={m} />
          ))}
        </div>

        <p className="t-meta mt-3">
          {Math.abs(gap) < 200
            ? `Within ${Math.abs(gap)} kcal of target. Adjust portions, not meals.`
            : gap < 0
              ? `${Math.abs(gap)} kcal under target. ${goal === 'bulk' ? 'Add the mass shake below.' : 'Add a yogurt cup or 4 oz more chicken.'}`
              : `${gap} kcal over target. Trim the bedtime meal first.`}{' '}
          {proteinGap >= 0
            ? `Protein covered with ${proteinGap}g spare.`
            : `${Math.abs(proteinGap)}g short on protein — add a scoop of whey.`}
        </p>
      </section>

      {extras.length > 0 && (
        <section className="mt-8">
          <div className="border-b border-rule pb-2">
            <h2 className="t-section">If the scale stalls</h2>
            <p className="t-meta mt-0.5">Run the plan above for two weeks before adding these.</p>
          </div>
          <div>
            {extras.map((m) => (
              <MealRow key={m.id} recipe={m} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="border-b border-rule pb-2">
          <h2 className="t-section">School lunch</h2>
          <p className="t-meta mt-0.5">Building the best tray from whatever the line has.</p>
        </div>
        <ul>
          {plan.schoolLunch.map((s, i) => (
            <li key={i} className="flex gap-3.5 border-b border-rule-soft py-2.5">
              <span className="mono w-4 shrink-0 text-[12.5px] text-ink-4">{i + 1}</span>
              <span className="text-[13.5px] leading-relaxed text-ink-2">{s}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="t-section border-b border-rule pb-2">Rules</h2>
        <div className="grid sm:grid-cols-2 sm:gap-x-8">
          {plan.rules.map((r) => (
            <div key={r.title} className="border-b border-rule-soft py-3">
              <h3 className="t-item text-[13.5px]">{r.title}</h3>
              <p className="t-meta mt-0.5">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="border-b border-rule pb-2">
          <h2 className="t-section">Grocery list</h2>
          <p className="t-meta mt-0.5">One shop a week.</p>
        </div>
        <div className="grid gap-x-8 sm:grid-cols-2">
          {GROCERY.map((g) => (
            <div key={g.section} className="border-b border-rule-soft py-3.5">
              <h3 className="t-item text-[13.5px]">{g.section}</h3>
              <p className="t-meta mt-0.5">{g.where}</p>
              <ul className="mt-2">
                {g.items.map((it, i) => (
                  <li key={i} className="py-1 text-[13px] text-ink-2">
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="t-section border-b border-rule pb-2">Supplements</h2>
        <div>
          {SUPPLEMENTS.map((s) => (
            <div
              key={s.name}
              className="grid gap-x-6 gap-y-1 border-b border-rule-soft py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="t-item text-[13.5px]">{s.name}</h3>
                  <Tag tone={s.verdict === 'Skip it' ? 'bad' : 'good'}>{s.verdict}</Tag>
                </div>
                <p className="mono mt-0.5 text-[11.5px] text-ink-3">{s.dose}</p>
              </div>
              <p className="t-meta">{s.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
