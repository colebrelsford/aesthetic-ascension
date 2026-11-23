-- Applied as migration program_exercises_library_link
alter table coach_workout_program_exercises add column if not exists library_exercise_id uuid references exercise_library(id) on delete set null;
create index if not exists coach_workout_program_exercises_library_idx on coach_workout_program_exercises(library_exercise_id);
