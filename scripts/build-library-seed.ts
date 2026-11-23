// Builds SQL that seeds exercise_library from data/exercise-library.json.
// Usage: node scripts/build-library-seed.ts <coach_id> [names.txt to check coverage]
// Coach cues are copied from the coach's existing coach_exercises notes (cuesFrom).
import { readFileSync } from 'node:fs'
import { normalizeExerciseName } from '../lib/exerciseNames.ts'

interface Entry {
  name: string; muscle: string; equipment: string; sets: number | null; reps: string | null
  instructions: string; aliases: string[]; cuesFrom?: string
}

const [coachId, namesFile] = process.argv.slice(2)
if (!coachId) { console.error('coach_id required'); process.exit(1) }
const lib: Entry[] = JSON.parse(readFileSync(new URL('../data/exercise-library.json', import.meta.url), 'utf8'))

// Each entry's match keys: its own name plus aliases, normalized and de-duplicated
const keyOwner = new Map<string, string>()
const problems: string[] = []
for (const e of lib) {
  for (const k of new Set([e.name, ...e.aliases].map(normalizeExerciseName))) {
    const owner = keyOwner.get(k)
    if (owner && owner !== e.name) problems.push(`"${k}" claimed by both "${owner}" and "${e.name}"`)
    keyOwner.set(k, e.name)
  }
}

if (namesFile) {
  const names = readFileSync(namesFile, 'utf8').split('|').map(s => s.trim()).filter(Boolean)
  const unmatched = names.filter(n => !keyOwner.has(normalizeExerciseName(n)))
  console.error(`coverage: ${names.length - unmatched.length}/${names.length} logged names match a library exercise`)
  for (const u of unmatched) console.error(`  unmatched: ${u}  ->  "${normalizeExerciseName(u)}"`)
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1) }

const q = (s: string | null | undefined) => s == null ? 'null' : `'${s.replace(/'/g, "''")}'`
const rows = lib.map(e => {
  const aliases = [...new Set(e.aliases.map(normalizeExerciseName))].filter(a => a !== normalizeExerciseName(e.name))
  const cues = e.cuesFrom
    ? `(select notes from public.coach_exercises where coach_id = ${q(coachId)} and name = ${q(e.cuesFrom)} limit 1)`
    : 'null'
  return `(${q(coachId)}, ${q(e.name)}, ${q(e.muscle)}, ${q(e.equipment)}, ${q(e.instructions)}, ${cues}, ${e.sets ?? 'null'}, ${q(e.reps)}, array[${aliases.map(q).join(',')}]::text[])`
})

console.log(`insert into public.exercise_library (coach_id, name, muscle_group, equipment, instructions, cues, default_sets, default_reps, aliases) values
${rows.join(',\n')}
on conflict (coach_id, lower(name)) do update set
  muscle_group = excluded.muscle_group, equipment = excluded.equipment, instructions = excluded.instructions,
  cues = coalesce(excluded.cues, exercise_library.cues), default_sets = excluded.default_sets,
  default_reps = excluded.default_reps, aliases = excluded.aliases, updated_at = now();`)
