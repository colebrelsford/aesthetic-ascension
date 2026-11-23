'use client'

import { Plus, X } from 'lucide-react'

export interface SchemeValue {
  staggered: boolean
  sets: string          // used when not staggered
  reps: string          // used when not staggered
  perSet: string[]      // reps per set when staggered
}

export function emptyScheme(sets = '', reps = ''): SchemeValue {
  return { staggered: false, sets, reps, perSet: [] }
}

/** Build editor state from a saved exercise row. */
export function schemeFromRow(row: { set_scheme?: { reps: string }[] | null; target_sets: number | null; target_reps: string | null }): SchemeValue {
  if (row.set_scheme && row.set_scheme.length > 0 && !row.set_scheme.every(s => s.reps === row.set_scheme![0].reps)) {
    return { staggered: true, sets: String(row.set_scheme.length), reps: '', perSet: row.set_scheme.map(s => s.reps) }
  }
  return emptyScheme(row.target_sets?.toString() || '', row.target_reps || '')
}

/** Columns to save on workout_exercises. Staggered sets also fill target_sets/target_reps so older views still read sensibly. */
export function schemeToColumns(v: SchemeValue) {
  if (v.staggered) {
    const scheme = v.perSet.map(r => ({ reps: r.trim() }))
    return {
      target_sets: scheme.length || null,
      target_reps: scheme.length ? scheme.map(s => s.reps || '—').join(' / ') : null,
      set_scheme: scheme.length ? scheme : null,
    }
  }
  return {
    target_sets: v.sets ? parseInt(v.sets) : null,
    target_reps: v.reps || null,
    set_scheme: null,
  }
}

const inputCls = 'bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder:text-zinc-500 h-8 text-sm px-2 outline-none focus:border-zinc-500'

export default function SetSchemeEditor({ value, onChange }: { value: SchemeValue; onChange: (v: SchemeValue) => void }) {
  function toggleStaggered() {
    if (value.staggered) {
      onChange({ ...value, staggered: false, sets: String(value.perSet.length || ''), reps: value.perSet[0] || '' })
    } else {
      const n = Math.max(parseInt(value.sets) || 2, 1)
      onChange({ ...value, staggered: true, perSet: Array.from({ length: n }, () => value.reps) })
    }
  }

  return (
    <div className="space-y-2">
      {!value.staggered ? (
        <div className="flex items-center gap-2">
          <input value={value.sets} onChange={e => onChange({ ...value, sets: e.target.value })} placeholder="Sets" inputMode="numeric" className={`${inputCls} w-16`} />
          <span className="text-zinc-600 text-xs">×</span>
          <input value={value.reps} onChange={e => onChange({ ...value, reps: e.target.value })} placeholder="Reps e.g. 8-12" className={`${inputCls} w-28`} />
        </div>
      ) : (
        <div className="space-y-1.5">
          {value.perSet.map((reps, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-zinc-500 text-xs w-12">Set {i + 1}</span>
              <input
                value={reps}
                onChange={e => onChange({ ...value, perSet: value.perSet.map((r, j) => j === i ? e.target.value : r) })}
                placeholder="Reps e.g. 6-10"
                className={`${inputCls} w-28`}
              />
              {value.perSet.length > 1 && (
                <button type="button" onClick={() => onChange({ ...value, perSet: value.perSet.filter((_, j) => j !== i) })} className="text-zinc-600 hover:text-red-400" aria-label={`Remove set ${i + 1}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...value, perSet: [...value.perSet, value.perSet[value.perSet.length - 1] || ''] })} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white">
            <Plus className="w-3 h-3" /> Add set
          </button>
        </div>
      )}
      <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none w-fit">
        <input type="checkbox" checked={value.staggered} onChange={toggleStaggered} className="accent-[#C9A84C]" />
        Different reps per set
      </label>
    </div>
  )
}
