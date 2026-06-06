-- Fix RLS policies

-- Create a helper function that avoids recursive RLS lookups
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Re-enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Coach can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate clean policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Coach can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_my_role() = 'coach');

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Fix plans policies
DROP POLICY IF EXISTS "Client reads own plan" ON public.plans;
DROP POLICY IF EXISTS "Coach full access to plans" ON public.plans;

CREATE POLICY "Client reads own plan" ON public.plans
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Coach full access to plans" ON public.plans
  FOR ALL USING (public.get_my_role() = 'coach');

-- Fix weight logs policies
DROP POLICY IF EXISTS "Client manages own weight logs" ON public.weight_logs;
DROP POLICY IF EXISTS "Coach reads all weight logs" ON public.weight_logs;

CREATE POLICY "Client manages own weight logs" ON public.weight_logs
  FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "Coach reads all weight logs" ON public.weight_logs
  FOR SELECT USING (public.get_my_role() = 'coach');

-- Fix checkins policies
DROP POLICY IF EXISTS "Client manages own checkins" ON public.weekly_checkins;
DROP POLICY IF EXISTS "Coach reads all checkins" ON public.weekly_checkins;

CREATE POLICY "Client manages own checkins" ON public.weekly_checkins
  FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "Coach reads all checkins" ON public.weekly_checkins
  FOR SELECT USING (public.get_my_role() = 'coach');

-- Fix photos policies
DROP POLICY IF EXISTS "Client manages own photos" ON public.progress_photos;
DROP POLICY IF EXISTS "Coach reads all photos" ON public.progress_photos;

CREATE POLICY "Client manages own photos" ON public.progress_photos
  FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "Coach reads all photos" ON public.progress_photos
  FOR SELECT USING (public.get_my_role() = 'coach');
