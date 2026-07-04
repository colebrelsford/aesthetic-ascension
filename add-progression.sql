-- Workout sessions
CREATE TABLE public.workout_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Set logs (each set logged per exercise per session)
CREATE TABLE public.set_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.workout_sessions(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_name text NOT NULL,
  set_number int NOT NULL,
  weight_lbs numeric(6,1),
  reps int,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client manages own sessions" ON public.workout_sessions
  FOR ALL USING (auth.uid() = client_id);
CREATE POLICY "Coach reads all sessions" ON public.workout_sessions
  FOR SELECT USING (public.get_my_role() = 'coach');

CREATE POLICY "Client manages own set logs" ON public.set_logs
  FOR ALL USING (auth.uid() = client_id);
CREATE POLICY "Coach reads all set logs" ON public.set_logs
  FOR SELECT USING (public.get_my_role() = 'coach');

-- Expand weekly_checkins with new open-ended questions
ALTER TABLE public.weekly_checkins
  ADD COLUMN IF NOT EXISTS diet_adherence text,
  ADD COLUMN IF NOT EXISTS cardio_adherence text,
  ADD COLUMN IF NOT EXISTS three_wins text,
  ADD COLUMN IF NOT EXISTS three_struggles text,
  ADD COLUMN IF NOT EXISTS could_do_better text,
  ADD COLUMN IF NOT EXISTS progression_notes text;
