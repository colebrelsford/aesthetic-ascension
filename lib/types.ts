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
  created_at: string
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
