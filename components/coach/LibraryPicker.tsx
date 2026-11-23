'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { LibraryExercise } from '@/lib/types'
import { normalizeExerciseName } from '@/lib/exerciseNames'
import ExerciseDiagram from '@/components/shared/ExerciseDiagram'

interface Props {
  library: LibraryExercise[]
  onPick: (ex: LibraryExercise) => void
  placeholder?: string
  autoFocus?: boolean
}

/** Search-as-you-type picker over the exercise library (matches names, old names and muscle group). */
export default function LibraryPicker({ library, onPick, placeholder = 'Search exercise library…', autoFocus }: Props) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const results = useMemo(() => {
    const n = normalizeExerciseName(q)
    if (!n) return []
    const words = n.split(' ')
    return library
      .filter(ex => {
        const hay = [ex.name, ex.muscle_group || '', ex.equipment || '', ...ex.aliases].map(normalizeExerciseName).join(' | ')
        return words.every(w => hay.includes(w))
      })
      .slice(0, 8)
  }, [q, library])

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
      <input
        value={q}
        autoFocus={autoFocus}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 h-9 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-500"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full rounded-xl overflow-hidden shadow-xl max-h-80 overflow-y-auto" style={{ background: '#1a1a1a', border: '1px solid rgba(201,168,76,0.2)' }}>
          {results.map(ex => (
            <button
              key={ex.id}
              type="button"
              onMouseDown={() => { onPick(ex); setQ(''); setOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-800 transition-colors"
            >
              <ExerciseDiagram imageUrl={ex.image_url} name={ex.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-zinc-100 text-sm truncate">{ex.name}</p>
                <p className="text-zinc-500 text-xs">{[ex.muscle_group, ex.equipment].filter(Boolean).join(' · ')}</p>
              </div>
              {(ex.default_sets || ex.default_reps) && (
                <span className="text-xs shrink-0" style={{ color: '#C9A84C' }}>
                  {ex.default_sets ? `${ex.default_sets}×` : ''}{ex.default_reps || ''}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && q.trim() && results.length === 0 && (
        <div className="absolute z-20 top-full mt-1 w-full rounded-xl px-3 py-2.5 text-xs text-zinc-500" style={{ background: '#1a1a1a', border: '1px solid rgba(201,168,76,0.2)' }}>
          No library match — add it in the Exercise Library tab, or type a custom name below.
        </div>
      )}
    </div>
  )
}
