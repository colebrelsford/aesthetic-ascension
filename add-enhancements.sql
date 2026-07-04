-- Coach notes per client
CREATE TABLE public.coach_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  content text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.coach_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach full access to notes" ON public.coach_notes
  FOR ALL USING (public.get_my_role() = 'coach');

-- Body measurements
CREATE TABLE public.measurements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  waist_in numeric(5,2),
  hips_in numeric(5,2),
  chest_in numeric(5,2),
  left_arm_in numeric(5,2),
  right_arm_in numeric(5,2),
  left_quad_in numeric(5,2),
  right_quad_in numeric(5,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, date)
);

ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client manages own measurements" ON public.measurements
  FOR ALL USING (auth.uid() = client_id);
CREATE POLICY "Coach reads all measurements" ON public.measurements
  FOR SELECT USING (public.get_my_role() = 'coach');

-- Checkin read tracking (for unread badge)
CREATE TABLE public.checkin_reads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  checkin_id uuid REFERENCES public.weekly_checkins(id) ON DELETE CASCADE NOT NULL,
  coach_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE(checkin_id, coach_id)
);

ALTER TABLE public.checkin_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages own reads" ON public.checkin_reads
  FOR ALL USING (auth.uid() = coach_id);
