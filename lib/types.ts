export type Role = 'coach' | 'client'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  created_at: string
}

export interface Plan {
  id: string
  client_id: string
  meal_plan: string | null
  training_split: string | null
  supplement_protocol: string | null
  updated_at: string
}

export interface WeightLog {
  id: string
  client_id: string
  date: string
  weight_lbs: number
  notes: string | null
  created_at: string
}

export interface WeeklyCheckin {
  id: string
  client_id: string
  week_start: string
  energy_level: number
  sleep_quality: number
  stress_level: number
  adherence_nutrition: number
  adherence_training: number
  notes: string | null
  diet_adherence: string | null
  cardio_adherence: string | null
  three_wins: string | null
  three_struggles: string | null
  could_do_better: string | null
  progression_notes: string | null
  created_at: string
}

export interface WorkoutTemplate {
  id: string
  client_id: string
  name: string
  display_order: number
  created_at: string
}

export interface WorkoutExercise {
  id: string
  template_id: string
  client_id: string
  name: string
  display_order: number
  created_at: string
}

export interface WorkoutSession {
  id: string
  client_id: string
  session_date: string
  notes: string | null
  created_at: string
}

export interface SetLog {
  id: string
  session_id: string
  client_id: string
  exercise_name: string
  set_number: number
  weight_lbs: number | null
  reps: number | null
  created_at: string
}

export interface Measurement {
  id: string
  client_id: string
  date: string
  waist_in: number | null
  hips_in: number | null
  chest_in: number | null
  left_arm_in: number | null
  right_arm_in: number | null
  left_quad_in: number | null
  right_quad_in: number | null
  notes: string | null
  created_at: string
}

export interface CoachNote {
  id: string
  client_id: string
  content: string
  updated_at: string
}

export interface ProgressPhoto {
  id: string
  client_id: string
  checkin_id: string | null
  photo_url: string
  caption: string | null
  taken_at: string
  created_at: string
}
