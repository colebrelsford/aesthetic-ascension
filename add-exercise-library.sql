-- Exercise library (preview: feature/exercise-library)
-- Additive only: new table + nullable columns. The live app keeps using coach_exercises
-- and ignores the new columns, so applying this does not change current behaviour.

create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  muscle_group text,
  equipment text,
  instructions text,          -- how to perform the movement (shown to clients)
  cues text,                  -- coach's own coaching cues/notes
  image_url text,             -- mannequin diagram
  default_sets integer,
  default_reps text,
  aliases text[] not null default '{}',  -- other names this exercise has been logged under
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists exercise_library_coach_name_idx
  on public.exercise_library (coach_id, lower(name));

alter table public.exercise_library enable row level security;

drop policy if exists "Coach manages own library" on public.exercise_library;
create policy "Coach manages own library" on public.exercise_library
  for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

drop policy if exists "Signed-in users read library" on public.exercise_library;
create policy "Signed-in users read library" on public.exercise_library
  for select to authenticated using (true);

-- Link a client's programmed exercise to the library, and allow per-set rep targets
alter table public.workout_exercises
  add column if not exists library_exercise_id uuid references public.exercise_library(id) on delete set null,
  add column if not exists set_scheme jsonb,             -- e.g. [{"reps":"6-10"},{"reps":"10-15"}]
  add column if not exists previous_names text[] not null default '{}';  -- names kept for history after a swap

-- Tag logged sets with the library exercise so history survives renames/swaps
alter table public.set_logs
  add column if not exists library_exercise_id uuid references public.exercise_library(id) on delete set null;

create index if not exists set_logs_client_library_idx on public.set_logs (client_id, library_exercise_id);

-- Public bucket for exercise diagrams; only coaches can upload
insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do nothing;

drop policy if exists "Coaches upload exercise images" on storage.objects;
create policy "Coaches upload exercise images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exercise-images' and public.get_my_role() = 'coach');

drop policy if exists "Coaches update exercise images" on storage.objects;
create policy "Coaches update exercise images" on storage.objects
  for update to authenticated
  using (bucket_id = 'exercise-images' and public.get_my_role() = 'coach');
