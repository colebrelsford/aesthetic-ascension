// Shared helpers for matching exercise names across renames, typos and
// "— 3 sets" / "3x8-12 reps" suffixes that were typed into old programs.

export function normalizeExerciseName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^optional:\s*/, '')
    .replace(/\s*[—–-]\s*\d+\s*sets?\s*$/, '')        // "— 3 sets"
    .replace(/\s*[—–-]?\s*\d+\s*x\s*.*$/, '')          // "3x8-12 reps each side", "3x as many as possible"
    .replace(/[^a-z0-9/()]+/g, ' ')                    // punctuation & hyphens -> space
    .replace(/\s+/g, ' ')
    .trim()
}

export interface SetTarget { reps: string }

/** Per-set rep targets for a programmed exercise. Falls back to target_sets × target_reps. */
export function setTargets(ex: { set_scheme?: SetTarget[] | null; target_sets?: number | null; target_reps?: string | null }): SetTarget[] {
  if (ex.set_scheme && ex.set_scheme.length > 0) return ex.set_scheme
  const n = ex.target_sets || 0
  return Array.from({ length: n }, () => ({ reps: ex.target_reps || '' }))
}

/** Short label like "2 sets × 8-12" or "6-10 / 10-15" for staggered sets. */
export function setSchemeLabel(ex: { set_scheme?: SetTarget[] | null; target_sets?: number | null; target_reps?: string | null }): string {
  const t = setTargets(ex)
  if (t.length === 0) return ex.target_reps || ''
  const allSame = t.every(s => s.reps === t[0].reps)
  if (allSame) return `${t.length} set${t.length === 1 ? '' : 's'}${t[0].reps ? ` × ${t[0].reps}` : ''}`
  return t.map(s => s.reps || '—').join(' / ')
}

/**
 * Find the library entry for a programmed exercise: by its library link first,
 * otherwise automatically by name / old names / library aliases.
 */
export function findLibraryMatch<T extends { id: string; name: string; aliases: string[] }>(
  ex: { name: string; library_exercise_id?: string | null; previous_names?: string[] | null },
  library: T[],
): T | undefined {
  if (ex.library_exercise_id) {
    const linked = library.find(l => l.id === ex.library_exercise_id)
    if (linked) return linked
  }
  const keys = new Set([ex.name, ...(ex.previous_names || [])].map(normalizeExerciseName))
  return library.find(l => [l.name, ...l.aliases].some(n => keys.has(normalizeExerciseName(n))))
}
