-- IRON — Supabase schema
--
-- Paste this whole file into the Supabase dashboard (SQL Editor -> New query)
-- and hit Run. It is safe to run more than once.
--
-- Read the note on row-level security at the bottom before you share the site
-- with anyone outside your group.

-- ---------------------------------------------------------------------------
-- Lifters
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          text primary key,
  name        text        not null,
  unit        text        not null default 'lb',
  bodyweight  numeric     not null default 165,
  goal        text        not null default 'bulk',
  accent      text        not null default 'ember',
  prs         jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Settings everyone shares: which training week, and legs-or-arms Wednesday.
-- Exactly one row, id = 'shared'.
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id         text primary key default 'shared',
  week       int         not null default 1,
  wednesday  text        not null default 'legs',
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, week, wednesday)
values ('shared', 1, 'legs')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Completed sets. The id encodes profile|date|day|exercise|set so the client
-- can build it without a round trip, and day_stamp keeps each session's ticks
-- separate from last week's.
-- ---------------------------------------------------------------------------
create table if not exists public.set_logs (
  id          text primary key,
  profile_id  text        not null references public.profiles(id) on delete cascade,
  day_stamp   date        not null,
  day_key     text        not null,
  exercise_id text        not null,
  set_index   int         not null,
  created_at  timestamptz not null default now()
);

create index if not exists set_logs_day_idx on public.set_logs (day_stamp);
create index if not exists set_logs_profile_day_idx on public.set_logs (profile_id, day_stamp);

-- Keep the table from growing forever; three months of history is plenty.
create or replace function public.prune_set_logs() returns trigger
language plpgsql as $$
begin
  delete from public.set_logs where day_stamp < current_date - interval '90 days';
  return null;
end;
$$;

drop trigger if exists prune_set_logs_trigger on public.set_logs;
create trigger prune_set_logs_trigger
  after insert on public.set_logs
  for each statement execute function public.prune_set_logs();

-- ---------------------------------------------------------------------------
-- Row-level security
--
-- The site has no login by design, so every visitor talks to Supabase as the
-- anonymous role using the public anon key. These policies therefore allow
-- anyone who has the site URL to read and change the data.
--
-- That is fine for a handful of friends. It is NOT fine if the link gets
-- passed around, because someone could wipe your PRs. If that ever matters,
-- replace the `using (true)` / `with check (true)` clauses below with a check
-- against a shared secret, or turn on Supabase Auth.
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.app_settings enable row level security;
alter table public.set_logs     enable row level security;

drop policy if exists profiles_anon_all     on public.profiles;
drop policy if exists app_settings_anon_all on public.app_settings;
drop policy if exists set_logs_anon_all     on public.set_logs;

create policy profiles_anon_all on public.profiles
  for all to anon, authenticated using (true) with check (true);

create policy app_settings_anon_all on public.app_settings
  for all to anon, authenticated using (true) with check (true);

create policy set_logs_anon_all on public.set_logs
  for all to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Seed Steven and Zach so the site has something the first time it loads.
-- Edit their numbers on the Lifters page afterwards.
-- ---------------------------------------------------------------------------
insert into public.profiles (id, name, unit, bodyweight, goal, accent, prs) values
  ('steven', 'Steven', 'lb', 165, 'bulk', 'ember',
   '{"bench":185,"squat":225,"deadlift":275}'::jsonb),
  ('zach',   'Zach',   'lb', 160, 'bulk', 'ice',
   '{"bench":175,"squat":215,"deadlift":265}'::jsonb)
on conflict (id) do nothing;
