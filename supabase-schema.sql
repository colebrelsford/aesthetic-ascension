-- Run this entire file in the Supabase SQL editor

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null check (role in ('coach', 'client')),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Plans
create table public.plans (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  meal_plan text,
  training_split text,
  supplement_protocol text,
  updated_at timestamptz default now(),
  unique(client_id)
);

-- Weight logs
create table public.weight_logs (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  weight_lbs numeric(5,1) not null,
  notes text,
  created_at timestamptz default now(),
  unique(client_id, date)
);

-- Weekly check-ins
create table public.weekly_checkins (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  week_start date not null,
  energy_level int check (energy_level between 1 and 10),
  sleep_quality int check (sleep_quality between 1 and 10),
  stress_level int check (stress_level between 1 and 10),
  adherence_nutrition int check (adherence_nutrition between 1 and 10),
  adherence_training int check (adherence_training between 1 and 10),
  notes text,
  created_at timestamptz default now(),
  unique(client_id, week_start)
);

-- Progress photos
create table public.progress_photos (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  checkin_id uuid references public.weekly_checkins(id) on delete set null,
  photo_url text not null,
  caption text,
  taken_at timestamptz not null,
  created_at timestamptz default now()
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.weight_logs enable row level security;
alter table public.weekly_checkins enable row level security;
alter table public.progress_photos enable row level security;

-- Profiles: users see their own, coach sees all
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Coach can view all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Plans: clients read their own, coach can do everything
create policy "Client reads own plan" on public.plans for select using (auth.uid() = client_id);
create policy "Coach full access to plans" on public.plans for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);

-- Weight logs: clients manage own, coach reads all
create policy "Client manages own weight logs" on public.weight_logs for all using (auth.uid() = client_id);
create policy "Coach reads all weight logs" on public.weight_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);

-- Checkins: clients manage own, coach reads all
create policy "Client manages own checkins" on public.weekly_checkins for all using (auth.uid() = client_id);
create policy "Coach reads all checkins" on public.weekly_checkins for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);

-- Photos: clients manage own, coach reads all
create policy "Client manages own photos" on public.progress_photos for all using (auth.uid() = client_id);
create policy "Coach reads all photos" on public.progress_photos for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);

-- Storage bucket for progress photos
-- Run this in Supabase Dashboard > Storage > New bucket: "progress-photos" (public)
-- Then add this policy in Storage > progress-photos > Policies:
-- Allow authenticated uploads: (auth.uid()::text) = (storage.foldername(name))[1]
