import type { Goal, Recipe } from '../lib/types'

/* ------------------------------------------------------------------ */
/*  Recipes — everything here is 10 minutes or less, or bought ready   */
/* ------------------------------------------------------------------ */

export const RECIPES: Recipe[] = [
  /* ---------------- BULK ---------------- */
  {
    id: 'growth-bowl',
    name: 'The 3-Minute Growth Bowl',
    slot: 'Breakfast',
    time: '3 min',
    kcal: 930,
    protein: 51,
    carbs: 120,
    fat: 30,
    goals: ['bulk'],
    blurb:
      'Quick breakfast before school. Roughly a third of the day\'s calories.',
    ingredients: [
      '1 cup dry old-fashioned oats',
      '1 cup whole milk (plus a splash more if it is too thick)',
      '2 tbsp peanut butter',
      '1 large banana, sliced',
      '1 tbsp honey',
      '1 scoop vanilla or chocolate whey',
    ],
    steps: [
      'Dump the oats and milk in a big bowl. Microwave 2 minutes.',
      'Stir in the peanut butter and honey while it is hot so it melts through.',
      'Let it sit 30 seconds, then stir in the whey. Adding whey to boiling-hot oats makes it clumpy — wait the 30 seconds.',
      'Top with the banana. Eat it. Do not skip this because you woke up late.',
    ],
    swap: 'No whey? Use 1 cup of Greek yogurt stirred in at the end instead. Same protein.',
  },
  {
    id: 'kwik-fuel',
    name: 'Kwik Trip Pre-Lift Stop',
    slot: 'Pre-lift',
    time: '0 min',
    kcal: 265,
    protein: 9,
    carbs: 53,
    fat: 3,
    goals: ['bulk'],
    blurb:
      'Fast carbs 30-45 minutes before lifting. Grabbed on the way in.',
    ingredients: ['1 banana', '1 pint Kwik Trip chocolate milk (or any 8 oz chocolate milk)'],
    steps: [
      'Buy it. Drink it in the parking lot.',
      'Aim for 30-45 minutes before your first working set.',
      'If your stomach is sensitive, drink the milk and save the banana for during the session.',
    ],
    swap: 'Rice Krispie treat or a granola bar works identically. You want sugar, not a meal.',
  },
  {
    id: 'rotisserie-bowl',
    name: 'Rotisserie Chicken Rice Bowl',
    slot: 'Post-lift',
    time: '6 min',
    kcal: 880,
    protein: 75,
    carbs: 83,
    fat: 26,
    goals: ['bulk'],
    blurb:
      'Post-lift protein with no cooking. Rotisserie chicken is the cheapest protein per dollar.',
    ingredients: [
      'Half a rotisserie chicken, meat pulled off (about 8 oz)',
      '1.5 cups cooked white rice (microwave rice cups are fine)',
      '2 tbsp BBQ sauce or teriyaki',
      '1/4 cup shredded cheese',
      'Hot sauce, as much as you want — it is free calories-wise',
    ],
    steps: [
      'Microwave the rice cup for 90 seconds, or scoop from the batch you made Sunday.',
      'Pull the chicken off the bone with your hands while the rice heats. Takes about 2 minutes.',
      'Pile chicken on rice, hit it with sauce and cheese, microwave 30 more seconds to melt.',
      'Eat within about an hour of your last set. Sooner is better but do not stress about it.',
    ],
    swap: 'Rotisserie sold out? A bag of frozen grilled chicken strips, microwaved, is the same thing for the same money.',
  },
  {
    id: 'beef-skillet',
    name: '10-Minute Beef & Rice Skillet',
    slot: 'Dinner',
    time: '10 min',
    kcal: 850,
    protein: 55,
    carbs: 70,
    fat: 37,
    goals: ['bulk'],
    blurb:
      'One pan, ten minutes. Calorie-dense without much volume.',
    ingredients: [
      '1/2 lb 85/15 ground beef',
      '1.5 cups cooked rice',
      '1/2 packet taco seasoning (or just salt, pepper, garlic powder)',
      '1/4 cup shredded cheese',
      'Optional: 2 tbsp sour cream, salsa',
    ],
    steps: [
      'Pan on medium-high. Beef straight in, break it up with the spoon.',
      'Cook 6-7 minutes until no pink is left. Do NOT drain the fat — those are calories you need.',
      'Sprinkle the seasoning and a splash of water, stir 1 minute.',
      'Kill the heat, dump the rice in, stir it together, top with cheese and sour cream.',
    ],
    swap: 'Not in the mood for beef? Two chicken thighs and the same rice works. Thighs, not breast — you want the fat on a bulk.',
  },
  {
    id: 'mass-shake',
    name: 'The Mass Shake',
    slot: 'Snack',
    time: '2 min',
    kcal: 1185,
    protein: 84,
    carbs: 121,
    fat: 45,
    goals: ['bulk'],
    blurb:
      'For stalled weeks. Add one a day if the scale has not moved in ten days.',
    ingredients: [
      '2 cups whole milk',
      '2 scoops whey',
      '2 bananas',
      '3 tbsp peanut butter',
      '1/2 cup dry oats',
    ],
    steps: [
      'Everything in the blender. Blend 45 seconds.',
      'Drink it over 20-30 minutes, not in one go, or you will not want dinner.',
      'Best sipped during your last class or on the drive to the gym.',
    ],
    swap: 'Too full to drink it? Halve it and have it twice a day instead.',
  },
  {
    id: 'casein-bowl',
    name: 'Bedtime Cottage Cheese Bowl',
    slot: 'Before bed',
    time: '2 min',
    kcal: 440,
    protein: 32,
    carbs: 27,
    fat: 26,
    goals: ['bulk'],
    blurb:
      'Casein digests over 6-7 hours, so protein keeps arriving overnight.',
    ingredients: ['1 cup full-fat cottage cheese', '2 tbsp peanut butter', '1 tbsp honey', 'Cinnamon'],
    steps: [
      'Cottage cheese in a bowl.',
      'Microwave the peanut butter 15 seconds so it pours, drizzle it over.',
      'Honey and cinnamon on top. Stir. It tastes far better than it sounds.',
    ],
    swap: 'Hate cottage cheese? 1.5 cups of Greek yogurt is nearly identical. Or a slow-digesting casein shake.',
  },

  /* ---------------- CUT ---------------- */
  {
    id: 'lean-oats',
    name: 'Lean Oats',
    slot: 'Breakfast',
    time: '3 min',
    kcal: 470,
    protein: 35,
    carbs: 61,
    fat: 12,
    goals: ['cut'],
    blurb:
      'Half the oats, water instead of milk, protein from a scoop. Holds until lunch.',
    ingredients: [
      '1/2 cup dry oats',
      'Water',
      '1 tbsp peanut butter',
      '1 banana',
      '1 scoop whey',
      'Cinnamon, plenty of it',
    ],
    steps: [
      'Oats and water, microwave 2 minutes.',
      'Wait 30 seconds, then stir in the whey and peanut butter.',
      'Slice the banana on top. Cinnamon makes it taste sweeter than it is.',
    ],
    swap: 'Still hungry by 10am? Add a second scoop of whey rather than more oats. Protein is what keeps you full.',
  },
  {
    id: 'cut-prelift',
    name: 'Banana + Black Coffee',
    slot: 'Pre-lift',
    time: '0 min',
    kcal: 105,
    protein: 1,
    carbs: 27,
    fat: 0,
    goals: ['cut'],
    blurb:
      'Enough sugar to train on, almost no calories. Caffeine 45 minutes out.',
    ingredients: ['1 banana', '12-16 oz black coffee (Kwik Trip refill, or any energy drink with no sugar)'],
    steps: [
      'Coffee 45 minutes before you lift.',
      'Banana about 30 minutes out.',
      'Do not add sugar or creamer to the coffee on a cut. That is 150 wasted calories.',
    ],
  },
  {
    id: 'cut-rotisserie',
    name: 'Rotisserie Chicken, Lean Build',
    slot: 'Post-lift',
    time: '5 min',
    kcal: 460,
    protein: 50,
    carbs: 36,
    fat: 12,
    goals: ['cut'],
    blurb:
      'Same chicken, skin removed and breast-heavy. About 150 kcal less, same protein.',
    ingredients: [
      '6 oz rotisserie chicken, skin removed, breast meat if you can',
      '3/4 cup cooked white rice',
      'Two big handfuls of spinach',
      'Hot sauce, mustard, or salsa — all basically zero calories',
    ],
    steps: [
      'Rice in the bowl, spinach on top, microwave 60 seconds so the spinach wilts down.',
      'Pull the skin off the chicken and shred the meat over it.',
      'Hot sauce, not BBQ sauce. BBQ is 60 calories of sugar per two tablespoons.',
    ],
    swap: 'The skin is where almost all the fat lives. Take it off and this becomes one of the leanest meals you can buy.',
  },
  {
    id: 'cut-dinner',
    name: 'Chicken, Rice & Frozen Veg',
    slot: 'Dinner',
    time: '8 min',
    kcal: 495,
    protein: 60,
    carbs: 46,
    fat: 7,
    goals: ['cut'],
    blurb:
      'Two cups of frozen broccoli is 60 kcal and most of the volume.',
    ingredients: [
      '6 oz chicken breast (frozen grilled strips are fine)',
      '3/4 cup cooked rice',
      '2 cups frozen broccoli or stir-fry mix',
      'Soy sauce and sriracha',
    ],
    steps: [
      'Frozen veg in a bowl with a splash of water, microwave 4 minutes covered.',
      'Chicken strips in the same bowl, 2 more minutes.',
      'Rice in, soy sauce and sriracha over the top, stir.',
    ],
    swap: 'Cook it in a pan with a teaspoon of oil if you want it to taste better. That is only 40 extra calories.',
  },
  {
    id: 'greek-cup',
    name: 'Greek Yogurt Cup',
    slot: 'Snack',
    time: '1 min',
    kcal: 200,
    protein: 22,
    carbs: 26,
    fat: 0,
    goals: ['cut'],
    blurb:
      'Afternoon snack. 22g protein for 200 kcal.',
    ingredients: ['1 cup nonfat plain Greek yogurt', '1/2 cup frozen berries', '1 tsp honey'],
    steps: [
      'Berries straight from frozen into the yogurt.',
      'Honey, stir, done. The frozen berries thaw into it and make it taste like ice cream.',
    ],
    swap: 'Buy the flavored single-serve cups if plain is unbearable. Slightly more sugar, still fine.',
  },
  {
    id: 'cut-casein',
    name: 'Cottage Cheese & Berries',
    slot: 'Before bed',
    time: '1 min',
    kcal: 260,
    protein: 27,
    carbs: 20,
    fat: 5,
    goals: ['cut'],
    blurb:
      'Slow protein overnight. This is what protects muscle in a deficit.',
    ingredients: ['1 cup low-fat cottage cheese', '1/2 cup frozen berries', 'Cinnamon'],
    steps: ['Combine. Eat within an hour of going to bed.'],
    swap: '1.5 cups of Greek yogurt does the same job.',
  },
]

/* ------------------------------------------------------------------ */
/*  Plans                                                              */
/* ------------------------------------------------------------------ */

export interface Plan {
  goal: Goal
  title: string
  tagline: string
  blurb: string
  meals: string[]
  extras: string[]
  rules: { title: string; body: string }[]
  schoolLunch: string[]
}

export const PLANS: Record<Goal, Plan> = {
  bulk: {
    goal: 'bulk',
    title: 'Bulk',
    tagline: 'Gain 0.5 to 1 lb a week',
    blurb:
      'A lean bulk. Target +0.5-1 lb a week; if the scale climbs faster, drop the bedtime meal.',
    meals: ['growth-bowl', 'kwik-fuel', 'rotisserie-bowl', 'beef-skillet'],
    extras: ['mass-shake', 'casein-bowl'],
    rules: [
      {
        title: 'Weigh in Saturday morning',
        body: 'Same time, after the bathroom, before you eat anything. One number a week — daily weight bounces around too much to mean anything.',
      },
      {
        title: 'Not gaining? Add, do not rearrange',
        body: 'Two weeks with no movement on the scale means add the Mass Shake. Do not overthink the rest of the plan.',
      },
      {
        title: 'Gaining too fast?',
        body: 'More than 1.5 lb a week is mostly fat. Drop the bedtime bowl first, then swap whole milk for 2%.',
      },
      {
        title: 'Protein is the floor, not the ceiling',
        body: 'Hit your protein number every single day even if you miss calories. Muscle cannot be built out of carbs.',
      },
    ],
    schoolLunch: [
      'Take the meat. Double it if they let you — chicken sandwich, burger, chicken nuggets.',
      'Take the milk. Take two if you can. Free 8g of protein each.',
      'Carbs are fine here. Fries, bread, pasta — you are bulking, that is fuel for the weight room later.',
      'If lunch is genuinely inedible, keep a jar of peanut butter and a spoon in your locker. 190 calories a scoop.',
    ],
  },
  cut: {
    goal: 'cut',
    title: 'Cut',
    tagline: 'Lose 1 to 1.5 lb a week, keep every pound of muscle',
    blurb:
      'High protein, carbs around training, low fat elsewhere. Keep the same weights on the bar.',
    meals: ['lean-oats', 'cut-prelift', 'cut-rotisserie', 'cut-dinner', 'greek-cup', 'cut-casein'],
    extras: [],
    rules: [
      {
        title: 'Never cut your training',
        body: 'Same weights, same sets. If your bench starts falling, eat 200 more calories a day. Cardio does not build the look — keeping your strength while the fat comes off does.',
      },
      {
        title: 'Walk, do not run',
        body: '8,000-10,000 steps a day burns real calories and costs you nothing in recovery. Sprints and long runs eat into leg day.',
      },
      {
        title: 'Drink water before you eat',
        body: 'A full glass 10 minutes before every meal. It sounds stupid and it genuinely works.',
      },
      {
        title: 'Protein goes UP on a cut',
        body: 'More than on a bulk. It keeps you full and it is what stops your body from breaking down muscle for fuel.',
      },
      {
        title: 'One meal off a week is fine',
        body: 'Pizza on Friday after the weight room will not undo anything. Six days of pizza will.',
      },
    ],
    schoolLunch: [
      'Take the meat, leave the bun if it is a big one. Chicken over anything fried.',
      'Take the milk — the white one, not chocolate.',
      'Skip the fries and the dessert. That is usually 400 calories right there.',
      'Fill the rest of the tray with whatever vegetable or salad is on offer, even if it is sad.',
      'Keep a protein bar in your bag for days the line has nothing.',
    ],
  },
}

/* ------------------------------------------------------------------ */
/*  Grocery list                                                       */
/* ------------------------------------------------------------------ */

export const GROCERY: { section: string; where: string; items: string[] }[] = [
  {
    section: 'Protein',
    where: 'Grocery store — buy the big packs, they are half the price per pound',
    items: [
      '2 rotisserie chickens (Sunday — one lasts 2 dinners)',
      '2 lb ground beef, 85/15',
      'Bag of frozen grilled chicken strips (backup for everything)',
      'Tub of whey protein (cheapest one that tastes fine)',
      'Large tub of cottage cheese',
      'Large tub of plain Greek yogurt',
      '18 eggs',
    ],
  },
  {
    section: 'Carbs',
    where: 'Grocery store',
    items: [
      'Big canister of old-fashioned oats (this lasts a month and costs almost nothing)',
      '5 lb bag of white rice, or a box of microwave rice cups if you will not cook',
      'Bunch of bananas — buy 10, they get eaten',
      'Loaf of bread',
      'Honey',
    ],
  },
  {
    section: 'Fats',
    where: 'Grocery store',
    items: ['Big jar of peanut butter', 'Olive oil or a cooking spray', 'Block of shredded cheese'],
  },
  {
    section: 'Vegetables',
    where: 'Freezer aisle — frozen is cheaper, lasts forever, and is just as good for you',
    items: ['Frozen broccoli', 'Frozen stir-fry mix', 'Frozen mixed berries', 'Bag of spinach'],
  },
  {
    section: 'Kwik Trip run',
    where: 'On the way to the weight room',
    items: [
      'Gallon of milk (whole for bulk, 2% for cut)',
      'Chocolate milk pints — the best cheap post-lift drink there is',
      'Bananas',
      'Beef sticks or jerky (12g protein, fits in a pocket)',
      'Coffee refill',
    ],
  },
]

export const SUPPLEMENTS = [
  {
    name: 'Creatine monohydrate',
    dose: '5 g every day, any time, forever',
    verdict: 'Take it',
    note: 'The only supplement with decades of evidence behind it. Costs about $15 for three months. Adds real strength and size. Unflavored powder in any drink — you will not taste it.',
  },
  {
    name: 'Whey protein',
    dose: '1-2 scoops a day, whenever you are short',
    verdict: 'Take it',
    note: 'Not magic, just cheap convenient food. It is what makes hitting your protein number possible on a school day.',
  },
  {
    name: 'Caffeine',
    dose: '150-300 mg, 45 min before lifting',
    verdict: 'Useful',
    note: 'Coffee or a cheap energy drink. Genuinely adds reps. Do not take it after 4pm or it will wreck your sleep, which matters more.',
  },
  {
    name: 'Vitamin D',
    dose: '2000 IU daily',
    verdict: 'Worth it in winter',
    note: 'Almost everyone in the upper Midwest is low on it from about October to April. Low vitamin D means worse recovery and worse mood.',
  },
  {
    name: 'Everything else',
    dose: '—',
    verdict: 'Skip it',
    note: 'Pre-workout blends, BCAAs, test boosters, mass gainers. You are paying for expensive caffeine and sugar. The Mass Shake is a better gainer than any tub you can buy.',
  },
]
