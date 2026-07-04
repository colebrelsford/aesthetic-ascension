-- Add macro targets to plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS calories int,
  ADD COLUMN IF NOT EXISTS protein_g int,
  ADD COLUMN IF NOT EXISTS carbs_g int,
  ADD COLUMN IF NOT EXISTS fat_g int;

-- Add avatar URL to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add checkin_deadline (day of week 0=Sun,1=Mon...6=Sat) and reminder email preference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS checkin_deadline_day int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkin_reminder_enabled boolean DEFAULT true;
