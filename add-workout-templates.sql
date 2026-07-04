-- Workout days (e.g. "Push Day", "Pull Day", "Legs")
CREATE TABLE public.workout_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Exercises within each workout day
CREATE TABLE public.workout_exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid REFERENCES public.workout_templates(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client reads own templates" ON public.workout_templates
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Coach full access to templates" ON public.workout_templates
  FOR ALL USING (public.get_my_role() = 'coach');

CREATE POLICY "Client reads own exercises" ON public.workout_exercises
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Coach full access to exercises" ON public.workout_exercises
  FOR ALL USING (public.get_my_role() = 'coach');
