'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LibraryExercise } from '@/lib/types'
import { normalizeExerciseName } from '@/lib/exerciseNames'
import { toast } from 'sonner'
import { Plus, Search, X, Trash2 } from 'lucide-react'

export const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Adductors', 'Calves', 'Abs']
const EQUIPMENT = ['Barbell', 'Dumbbell', 'EZ bar', 'Cable', 'Machine', 'Smith machine', 'Kettlebell', 'Bodyweight']

interface Draft {
  id?: string
  name: string
  muscle_group: string
  equipment: string
  default_sets: string
  default_reps: string
  instructions: string
  cues: string
  aliases: string
  image_url: string | null
}

const blank: Draft = { name: '', muscle_group: '', equipment: '', default_sets: '', default_reps: '', instructions: '', cues: '', aliases: '', image_url: null }

const fieldCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-500'
const labelCls = 'text-zinc-400 text-xs font-medium'

export default function ExerciseLibrary({ coachId }: { coachId: string }) {
  const supabase = createClient()
  const [library, setLibrary] = useState<LibraryExercise[]>([])
  const [loaded, setLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('exercise_library').select('*').eq('coach_id', coachId).order('name')
      .then(({ data }) => { setLibrary(data || []); setLoaded(true) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId])

  const visible = useMemo(() => {
    const words = normalizeExerciseName(search).split(' ').filter(Boolean)
    return library.filter(ex => {
      if (muscle && ex.muscle_group !== muscle) return false
      if (!words.length) return true
      const hay = [ex.name, ex.equipment || '', ...ex.aliases].map(normalizeExerciseName).join(' | ')
      return words.every(w => hay.includes(w))
    })
  }, [library, search, muscle])

  function open(ex?: LibraryExercise) {
    setDraft(ex ? {
      id: ex.id,
      name: ex.name,
      muscle_group: ex.muscle_group || '',
      equipment: ex.equipment || '',
      default_sets: ex.default_sets?.toString() || '',
      default_reps: ex.default_reps || '',
      instructions: ex.instructions || '',
      cues: ex.cues || '',
      aliases: ex.aliases.join(', '),
      image_url: ex.image_url,
    } : { ...blank, muscle_group: muscle || '' })
  }

  async function save() {
    if (!draft || !draft.name.trim()) return
    setSaving(true)
    const row = {
      coach_id: coachId,
      name: draft.name.trim(),
      muscle_group: draft.muscle_group || null,
      equipment: draft.equipment || null,
      default_sets: draft.default_sets ? parseInt(draft.default_sets) : null,
      default_reps: draft.default_reps.trim() || null,
      instructions: draft.instructions.trim() || null,
      cues: draft.cues.trim() || null,
      aliases: [...new Set(draft.aliases.split(',').map(normalizeExerciseName).filter(Boolean))],
      image_url: draft.image_url,
      updated_at: new Date().toISOString(),
    }
    const res = draft.id
      ? await supabase.from('exercise_library').update(row).eq('id', draft.id).select().single()
      : await supabase.from('exercise_library').insert(row).select().single()
    setSaving(false)
    if (res.error) {
      toast.error(res.error.code === '23505' ? 'An exercise with that name already exists' : 'Failed to save exercise')
      return
    }
    setLibrary(prev => [...prev.filter(e => e.id !== res.data.id), res.data].sort((a, b) => a.name.localeCompare(b.name)))
    setDraft(null)
    toast.success(draft.id ? 'Exercise updated' : 'Exercise added')
  }

  async function remove() {
    if (!draft?.id) return
    if (!window.confirm(`Delete "${draft.name}" from your library?\n\nClients who already have it in their program keep it — it just won't show the diagram or instructions anymore. Their logged history is not affected.`)) return
    const { error } = await supabase.from('exercise_library').delete().eq('id', draft.id)
    if (error) { toast.error('Failed to delete'); return }
    setLibrary(prev => prev.filter(e => e.id !== draft.id))
    setDraft(null)
    toast.success('Removed from library')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="text-white font-semibold">Exercise Library</h2>
          <p className="text-zinc-500 text-xs mt-0.5">{library.length} exercises</p>
        </div>
        <button onClick={() => open()} className="flex items-center gap-1.5 text-sm font-semibold text-black px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
          <Plus className="w-4 h-4" /> New exercise
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, old name or equipment…" className={`${fieldCls} pl-9`} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {[null, ...MUSCLE_GROUPS].map(m => (
          <button
            key={m ?? 'all'}
            onClick={() => setMuscle(m)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors"
            style={muscle === m
              ? { background: '#C9A84C', color: '#000', fontWeight: 600 }
              : { background: 'rgba(255,255,255,0.04)', color: '#999', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {m ?? 'All'}
          </button>
        ))}
      </div>

      {!loaded ? (
        <p className="text-zinc-500 text-sm text-center py-8">Loading library…</p>
      ) : visible.length === 0 ? (
        <p className="text-zinc-500 text-sm text-center py-8 border border-dashed border-zinc-800 rounded-xl">No exercises match.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visible.map(ex => (
            <button key={ex.id} onClick={() => open(ex)} className="text-left rounded-xl p-2.5 transition-colors hover:border-[rgba(201,168,76,0.4)]" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.12)' }}>
              <p className="text-zinc-100 text-sm font-medium leading-snug">{ex.name}</p>
              <p className="text-xs mt-0.5" style={{ color: '#C9A84C' }}>{[ex.muscle_group, ex.equipment].filter(Boolean).join(' · ')}</p>
              {ex.instructions && <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed line-clamp-3">{ex.instructions}</p>}
            </button>
          ))}
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4" onClick={() => setDraft(null)}>
          <div className="w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 space-y-4" style={{ background: '#121212', border: '1px solid rgba(201,168,76,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">{draft.id ? 'Edit exercise' : 'New exercise'}</h3>
              <button onClick={() => setDraft(null)} className="text-zinc-500 hover:text-white" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className={labelCls}>Name</label>
                  <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className={fieldCls} placeholder="e.g. Incline Dumbbell Bench Press" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className={labelCls}>Muscle group</label>
                    <select value={draft.muscle_group} onChange={e => setDraft({ ...draft, muscle_group: e.target.value })} className={fieldCls}>
                      <option value="">—</option>
                      {MUSCLE_GROUPS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Equipment</label>
                    <select value={draft.equipment} onChange={e => setDraft({ ...draft, equipment: e.target.value })} className={fieldCls}>
                      <option value="">—</option>
                      {EQUIPMENT.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className={labelCls}>Default sets</label>
                    <input value={draft.default_sets} onChange={e => setDraft({ ...draft, default_sets: e.target.value })} inputMode="numeric" className={fieldCls} placeholder="2" />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Default reps</label>
                    <input value={draft.default_reps} onChange={e => setDraft({ ...draft, default_reps: e.target.value })} className={fieldCls} placeholder="8-12" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>How to perform <span className="text-zinc-600">(shown to clients)</span></label>
              <textarea value={draft.instructions} onChange={e => setDraft({ ...draft, instructions: e.target.value })} rows={4} className={`${fieldCls} resize-y`} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Coaching cues <span className="text-zinc-600">(shown to clients)</span></label>
              <textarea value={draft.cues} onChange={e => setDraft({ ...draft, cues: e.target.value })} rows={3} className={`${fieldCls} resize-y`} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Also known as <span className="text-zinc-600">(comma separated — logged history under these names is linked to this exercise)</span></label>
              <textarea value={draft.aliases} onChange={e => setDraft({ ...draft, aliases: e.target.value })} rows={2} className={`${fieldCls} resize-y text-xs`} />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button onClick={save} disabled={saving || !draft.name.trim()} className="text-sm font-semibold text-black px-4 py-2 rounded-lg disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setDraft(null)} className="text-sm text-zinc-400 hover:text-white px-3 py-2">Cancel</button>
              {draft.id && (
                <button onClick={remove} className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
