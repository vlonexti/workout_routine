-- IRON — Supabase schema
--
-- Paste this whole file into the Supabase dashboard (SQL Editor -> New query)
-- and run it. It is idempotent: safe to run again after changes.
--
-- It also migrates the earlier single-table layout (public.profiles +
-- public.app_settings) into the normalised tables below without dropping
-- anything, so existing rows survive.

create extension if not exists "pgcrypto";

-- ===========================================================================
-- lifters — one row per athlete. Profile and their training settings.
-- ===========================================================================
create table if not exists public.lifters (
  id             uuid primary key default gen_random_uuid(),
  name           text        not null,
  accent         text        not null default 'ember',
  unit           text        not null default 'lb'   check (unit in ('lb', 'kg')),
  bodyweight     numeric(6,2) not null default 165   check (bodyweight > 0),
  goal           text        not null default 'bulk' check (goal in ('bulk', 'cut')),

  -- Training state is per lifter: Steven can be in week 3 while Zach is in 1.
  training_week  int         not null default 1      check (training_week between 1 and 4),
  wednesday      text        not null default 'legs' check (wednesday in ('legs', 'arms')),

  -- Nutrition targets are normally derived from bodyweight + goal. These are
  -- only set when someone deliberately overrides the calculated number.
  kcal_target    int,
  protein_target int,
  carb_target    int,
  fat_target     int,

  sort_order     int         not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ===========================================================================
-- pr_entries — append-only. The current PR for a lift is its newest row, and
-- keeping the older rows is what lets the UI show "+10 lb" honestly.
-- ===========================================================================
create table if not exists public.pr_entries (
  id          uuid primary key default gen_random_uuid(),
  lifter_id   uuid        not null references public.lifters(id) on delete cascade,
  lift        text        not null,
  value       numeric(6,2) not null check (value > 0),
  unit        text        not null default 'lb' check (unit in ('lb', 'kg')),
  recorded_at timestamptz not null default now()
);

create index if not exists pr_entries_lifter_lift_idx
  on public.pr_entries (lifter_id, lift, recorded_at desc);

-- ===========================================================================
-- bodyweight_entries — one weigh-in per lifter per day.
-- ===========================================================================
create table if not exists public.bodyweight_entries (
  id         uuid primary key default gen_random_uuid(),
  lifter_id  uuid         not null references public.lifters(id) on delete cascade,
  weight     numeric(6,2) not null check (weight > 0),
  unit       text         not null default 'lb' check (unit in ('lb', 'kg')),
  logged_on  date         not null default current_date,
  created_at timestamptz  not null default now(),
  unique (lifter_id, logged_on)
);

create index if not exists bodyweight_entries_lifter_idx
  on public.bodyweight_entries (lifter_id, logged_on desc);

-- ===========================================================================
-- set_logs — one row per completed working set. This is the workout history,
-- and the source of the "last session" line on each exercise.
-- ===========================================================================
create table if not exists public.set_logs (
  id            uuid primary key default gen_random_uuid(),
  lifter_id     uuid        not null references public.lifters(id) on delete cascade,
  performed_on  date        not null default current_date,
  day_key       text        not null,
  exercise_id   text        not null,
  set_index     int         not null check (set_index >= 0),
  weight        numeric(6,2),
  reps          int,
  training_week int,
  created_at    timestamptz not null default now(),
  unique (lifter_id, performed_on, day_key, exercise_id, set_index)
);

create index if not exists set_logs_lifter_date_idx
  on public.set_logs (lifter_id, performed_on desc);

-- Powers the "last session: 120 x 5" lookup.
create index if not exists set_logs_lifter_exercise_idx
  on public.set_logs (lifter_id, exercise_id, performed_on desc);

-- ===========================================================================
-- updated_at maintenance
-- ===========================================================================
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lifters_touch_updated_at on public.lifters;
create trigger lifters_touch_updated_at
  before update on public.lifters
  for each row execute function public.touch_updated_at();

-- ===========================================================================
-- Migration from the earlier layout, if it is still there.
-- Copies profiles -> lifters and profiles.prs -> pr_entries, once.
-- The old tables are left in place rather than dropped, so nothing is lost.
-- ===========================================================================
do $$
declare
  p record;
  new_id uuid;
  lift_key text;
  lift_val numeric;
  wk int := 1;
  wed text := 'legs';
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  if to_regclass('public.app_settings') is not null then
    select coalesce(week, 1), coalesce(wednesday, 'legs')
      into wk, wed
      from public.app_settings
     where id = 'shared'
     limit 1;
  end if;

  for p in select * from public.profiles loop
    -- Skip anyone already carried over by an earlier run of this script.
    if exists (select 1 from public.lifters l where l.name = p.name) then
      continue;
    end if;

    insert into public.lifters (name, accent, unit, bodyweight, goal, training_week, wednesday, created_at)
    values (p.name,
            coalesce(p.accent, 'ember'),
            coalesce(p.unit, 'lb'),
            coalesce(p.bodyweight, 165),
            coalesce(p.goal, 'bulk'),
            coalesce(wk, 1),
            coalesce(wed, 'legs'),
            coalesce(p.created_at, now()))
    returning id into new_id;

    if p.prs is not null then
      for lift_key, lift_val in select key, value::numeric from jsonb_each_text(p.prs) loop
        if lift_val > 0 then
          insert into public.pr_entries (lifter_id, lift, value, unit)
          values (new_id, lift_key, lift_val, coalesce(p.unit, 'lb'));
        end if;
      end loop;
    end if;
  end loop;
end $$;

-- ===========================================================================
-- Row-level security
--
-- The app has no login, so every visitor reaches Postgres as the anonymous
-- role using the publishable anon key. These policies therefore let anyone
-- with the site URL read and write.
--
-- That is the deal with having no accounts. It is fine for a few friends; it
-- is not fine if the link spreads, because someone could wipe the history.
-- To lock it down later, replace `using (true)` / `with check (true)` with a
-- check against a shared secret, or turn on Supabase Auth.
-- ===========================================================================
alter table public.lifters            enable row level security;
alter table public.pr_entries         enable row level security;
alter table public.bodyweight_entries enable row level security;
alter table public.set_logs           enable row level security;

drop policy if exists lifters_anon_all            on public.lifters;
drop policy if exists pr_entries_anon_all         on public.pr_entries;
drop policy if exists bodyweight_entries_anon_all on public.bodyweight_entries;
drop policy if exists set_logs_anon_all           on public.set_logs;

create policy lifters_anon_all on public.lifters
  for all to anon, authenticated using (true) with check (true);

create policy pr_entries_anon_all on public.pr_entries
  for all to anon, authenticated using (true) with check (true);

create policy bodyweight_entries_anon_all on public.bodyweight_entries
  for all to anon, authenticated using (true) with check (true);

create policy set_logs_anon_all on public.set_logs
  for all to anon, authenticated using (true) with check (true);

-- ===========================================================================
-- Seed. Only runs when the table is empty, so it never overwrites real data.
-- ===========================================================================
do $$
declare
  steven uuid;
  zach   uuid;
begin
  if exists (select 1 from public.lifters) then
    return;
  end if;

  insert into public.lifters (name, accent, unit, bodyweight, goal, sort_order)
  values ('Steven', 'ember', 'lb', 165, 'bulk', 0) returning id into steven;

  insert into public.lifters (name, accent, unit, bodyweight, goal, sort_order)
  values ('Zach', 'ice', 'lb', 160, 'bulk', 1) returning id into zach;

  insert into public.pr_entries (lifter_id, lift, value) values
    (steven, 'bench', 185), (steven, 'squat', 225), (steven, 'deadlift', 275),
    (zach,   'bench', 175), (zach,   'squat', 215), (zach,   'deadlift', 265);

  insert into public.bodyweight_entries (lifter_id, weight, logged_on) values
    (steven, 165, current_date),
    (zach,   160, current_date);
end $$;
