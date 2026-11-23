'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkoutTemplate, WorkoutExercise, LibraryExercise } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical, Pencil, Check, X, BookOpen, Repeat } from 'lucide-react'
import LibraryPicker from './LibraryPicker'
import SetSchemeEditor, { SchemeValue, emptyScheme, schemeFromRow, schemeToColumns } from './SetSchemeEditor'
import ExerciseDiagram from '@/components/shared/ExerciseDiagram'
import { setSchemeLabel } from '@/lib/exerciseNames'

interface Props {
  clientId: string
  coachId: string
}

interface NewExerciseState {
  name: string
  libraryId: string | null
  scheme: SchemeValue
  notes: string
}

interface EditExState {
  name: string
  libraryId: string | null
  scheme: SchemeValue
  notes: string
  keepHistory: boolean
}

const blankNew = (): NewExerciseState => ({ name: '', libraryId: null, scheme: emptyScheme(), notes: '' })

const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-8 text-sm'

export default function WorkoutBuilder({ clientId, coachId }: Props) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [exercises, setExercises] = useState<Record<string, WorkoutExercise[]>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [newDayName, setNewDayName] = useState('')
  const [newExercise, setNewExercise] = useState<Record<string, NewExerciseState>>({})
  const [editingDayId, setEditingDayId] = useState<string | null>(null)
  const [editingDayName, setEditingDayName] = useState('')
  const [editingExId, setEditingExId] = useState<string | null>(null)
  const [editEx, setEditEx] = useState<EditExState>({ name: '', libraryId: null, scheme: emptyScheme(), notes: '', keepHistory: true })
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const dragItem = useRef<{ templateId: string; index: number } | null>(null)

  // Exercise library (managed in the Exercise Library tab)
  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>([])
  const libById = (id: string | null | undefined) => (id ? libraryExercises.find(l => l.id === id) : undefined)

  const supabase = createClient()

  useEffect(() => { load() }, [clientId])
  useEffect(() => { loadLibrary() }, [coachId])

  async function load() {
    const { data: tmpl } = await supabase.from('workout_templates').select('*').eq('client_id', clientId).order('display_order')
    if (!tmpl) return
    setTemplates(tmpl)
    const { data: exs } = await supabase.from('workout_exercises').select('*').eq('client_id', clientId).order('display_order')
    if (!exs) return
    const grouped: Record<string, WorkoutExercise[]> = {}
    for (const ex of exs) {
      if (!grouped[ex.template_id]) grouped[ex.template_id] = []
      grouped[ex.template_id].push(ex)
    }
    setExercises(grouped)
  }

  async function loadLibrary() {
    const { data } = await supabase.from('exercise_library').select('*').eq('coach_id', coachId).order('name')
    if (data) setLibraryExercises(data)
  }

  function pickForNew(templateId: string, ex: LibraryExercise) {
    setNewExercise(prev => ({
      ...prev,
      [templateId]: {
        name: ex.name,
        libraryId: ex.id,
        scheme: emptyScheme(ex.default_sets?.toString() || '', ex.default_reps || ''),
        notes: prev[templateId]?.notes || '',
      },
    }))
  }

  async function addDay() {
    if (!newDayName.trim()) return
    setLoading(true)
    const { data, error } = await supabase.from('workout_templates').insert({ client_id: clientId, name: newDayName.trim(), display_order: templates.length }).select().single()
    setLoading(false)
    if (error) { toast.error('Failed to add workout day'); return }
    setTemplates(prev => [...prev, data])
    setExpanded(prev => ({ ...prev, [data.id]: true }))
    setNewDayName('')
    toast.success('Workout day added')
  }

  async function renameDay(id: string) {
    const name = editingDayName.trim()
    if (!name) return
    const { error } = await supabase.from('workout_templates').update({ name }).eq('id', id)
    if (error) { toast.error('Failed to rename'); return }
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, name } : t))
    setEditingDayId(null)
    toast.success('Renamed')
  }

  async function deleteDay(id: string) {
    await supabase.from('workout_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    setExercises(prev => { const n = { ...prev }; delete n[id]; return n })
    toast.success('Workout day removed')
  }

  function getNew(templateId: string): NewExerciseState {
    return newExercise[templateId] || blankNew()
  }

  function patchNew(templateId: string, patch: Partial<NewExerciseState>) {
    setNewExercise(prev => ({ ...prev, [templateId]: { ...getNew(templateId), ...patch } }))
  }

  async function addExercise(templateId: string) {
    const n = getNew(templateId)
    if (!n.name.trim()) return
    const order = (exercises[templateId] || []).length
    const { data, error } = await supabase.from('workout_exercises').insert({
      template_id: templateId,
      client_id: clientId,
      name: n.name.trim(),
      display_order: order,
      library_exercise_id: n.libraryId,
      ...schemeToColumns(n.scheme),
      exercise_notes: n.notes || null,
    }).select().single()
    if (error) { toast.error('Failed to add exercise'); return }
    setExercises(prev => ({ ...prev, [templateId]: [...(prev[templateId] || []), data] }))
    setNewExercise(prev => ({ ...prev, [templateId]: blankNew() }))
  }

  function startEditEx(ex: WorkoutExercise) {
    setEditingExId(ex.id)
    setEditEx({
      name: ex.name,
      libraryId: ex.library_exercise_id ?? null,
      scheme: schemeFromRow(ex),
      notes: ex.exercise_notes || '',
      keepHistory: true,
    })
  }

  async function saveEditEx(templateId: string, exId: string) {
    if (!editEx.name.trim()) return
    const current = exercises[templateId]?.find(e => e.id === exId)
    const newName = editEx.name.trim()
    // When the exercise is swapped/renamed, remember the old name so the client's logged history still shows
    let previous = current?.previous_names || []
    if (current && editEx.keepHistory && current.name !== newName && !previous.includes(current.name)) {
      previous = [...previous, current.name]
    }
    if (!editEx.keepHistory && current && current.library_exercise_id !== editEx.libraryId) previous = []
    const { data, error } = await supabase.from('workout_exercises').update({
      name: newName,
      library_exercise_id: editEx.libraryId,
      ...schemeToColumns(editEx.scheme),
      exercise_notes: editEx.notes || null,
      previous_names: previous,
    }).eq('id', exId).select().single()
    if (error) { toast.error('Failed to save'); return }
    setExercises(prev => ({ ...prev, [templateId]: prev[templateId].map(e => e.id === exId ? data : e) }))
    setEditingExId(null)
    toast.success('Exercise updated')
  }

  async function deleteExercise(templateId: string, exerciseId: string) {
    const ex = exercises[templateId]?.find(e => e.id === exerciseId)
    if (!window.confirm(`Remove "${ex?.name}" from this day?\n\nThe client's logged sets are kept. Tip: use Edit → Swap to replace it and keep its history showing.`)) return
    await supabase.from('workout_exercises').delete().eq('id', exerciseId)
    setExercises(prev => ({ ...prev, [templateId]: prev[templateId].filter(e => e.id !== exerciseId) }))
  }

  async function reorder(templateId: string, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    const list = [...(exercises[templateId] || [])]
    const [moved] = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, moved)
    const reindexed = list.map((ex, i) => ({ ...ex, display_order: i }))
    setExercises(prev => ({ ...prev, [templateId]: reindexed }))
    await Promise.all(reindexed.map(ex => supabase.from('workout_exercises').update({ display_order: ex.display_order }).eq('id', ex.id)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500 px-1">
        <BookOpen className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
        {libraryExercises.length} exercises in your library — add or edit them (and their diagrams) in the Exercise Library tab.
      </div>

      {/* Add Workout Day */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="font-medium text-white text-sm mb-3">Add Workout Day</h3>
        <div className="flex gap-2">
          <Input value={newDayName} onChange={(e) => setNewDayName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDay()} placeholder="e.g. Push Day, Pull Day, Legs..." className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" />
          <Button onClick={addDay} disabled={loading || !newDayName.trim()} className="bg-white text-black hover:bg-zinc-200 shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {templates.length === 0 && (
        <div className="text-center text-zinc-500 text-sm py-8 border border-dashed border-zinc-800 rounded-xl">
          No workout days yet. Add one above.
        </div>
      )}

      {templates.map(template => (
        <div key={template.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            {editingDayId === template.id ? (
              <div className="flex items-center gap-2 flex-1">
                <Input value={editingDayName} onChange={(e) => setEditingDayName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') renameDay(template.id); if (e.key === 'Escape') setEditingDayId(null) }} className="bg-zinc-800 border-zinc-700 text-white h-7 text-sm" autoFocus />
                <button onClick={() => renameDay(template.id)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingDayId(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => setExpanded(prev => ({ ...prev, [template.id]: !prev[template.id] }))} className="flex items-center gap-2 text-white font-medium text-sm flex-1 text-left">
                {expanded[template.id] ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                {template.name}
                <span className="text-zinc-500 text-xs font-normal">({(exercises[template.id] || []).length} exercises)</span>
              </button>
            )}
            {editingDayId !== template.id && (
              <div className="flex items-center gap-2 ml-2">
                <button onClick={() => { setEditingDayId(template.id); setEditingDayName(template.name) }} className="text-zinc-600 hover:text-zinc-300 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteDay(template.id)} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </div>

          {expanded[template.id] && (
            <div className="p-4 space-y-2">
              {(exercises[template.id] || []).map(ex => (
                <div key={ex.id}>
                  {editingExId === ex.id ? (
                    <div className="rounded-lg p-3 space-y-3" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
                      <div className="flex items-center gap-2">
                        <ExerciseDiagram imageUrl={libById(editEx.libraryId)?.image_url} name={editEx.name} size="sm" />
                        <Input value={editEx.name} onChange={e => setEditEx(p => ({ ...p, name: e.target.value }))} placeholder="Exercise name" className={inputCls} />
                      </div>
                      <div className="space-y-1">
                        <p className="flex items-center gap-1 text-zinc-500 text-xs"><Repeat className="w-3 h-3" /> Swap for another exercise</p>
                        <LibraryPicker
                          library={libraryExercises}
                          placeholder="Search library to swap…"
                          onPick={lib => setEditEx(p => ({
                            ...p,
                            name: lib.name,
                            libraryId: lib.id,
                            scheme: p.scheme.sets || p.scheme.staggered ? p.scheme : emptyScheme(lib.default_sets?.toString() || '', lib.default_reps || ''),
                          }))}
                        />
                        {editEx.name.trim() !== ex.name && (
                          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none w-fit pt-1">
                            <input type="checkbox" checked={editEx.keepHistory} onChange={e => setEditEx(p => ({ ...p, keepHistory: e.target.checked }))} className="accent-[#C9A84C]" />
                            Keep showing the client&apos;s history from &quot;{ex.name}&quot;
                          </label>
                        )}
                      </div>
                      <SetSchemeEditor value={editEx.scheme} onChange={scheme => setEditEx(p => ({ ...p, scheme }))} />
                      <Input value={editEx.notes} onChange={e => setEditEx(p => ({ ...p, notes: e.target.value }))} placeholder="Client-specific notes (optional)" className={inputCls} />
                      <div className="flex gap-2">
                        <button onClick={() => saveEditEx(ex.template_id, ex.id)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium text-black" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
                          <Check className="w-3 h-3" /> Save
                        </button>
                        <button onClick={() => setEditingExId(null)} className="text-xs px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-800">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 group py-1 rounded-lg transition-colors"
                      style={dragOver === ex.id ? { background: 'rgba(201,168,76,0.08)', outline: '1px dashed rgba(201,168,76,0.3)' } : {}}
                      draggable
                      onDragStart={() => { dragItem.current = { templateId: ex.template_id, index: (exercises[ex.template_id] || []).findIndex(e => e.id === ex.id) } }}
                      onDragOver={e => { e.preventDefault(); setDragOver(ex.id) }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => {
                        setDragOver(null)
                        if (!dragItem.current || dragItem.current.templateId !== ex.template_id) return
                        const toIndex = (exercises[ex.template_id] || []).findIndex(e => e.id === ex.id)
                        reorder(ex.template_id, dragItem.current.index, toIndex)
                        dragItem.current = null
                      }}
                    >
                      <GripVertical className="w-4 h-4 text-zinc-600 shrink-0 cursor-grab active:cursor-grabbing" />
                      {ex.library_exercise_id && <ExerciseDiagram imageUrl={libById(ex.library_exercise_id)?.image_url} name={ex.name} size="sm" className="!w-9 !h-9" />}
                      <div className="flex-1 min-w-0">
                        <span className="text-zinc-200 text-sm">{ex.name}</span>
                        {(ex.target_sets || ex.target_reps) && (
                          <span className="ml-2 text-xs" style={{ color: '#C9A84C' }}>{setSchemeLabel(ex)}</span>
                        )}
                        {!ex.library_exercise_id && <span className="ml-2 text-[10px] uppercase tracking-wide text-zinc-600">custom</span>}
                        {ex.exercise_notes && <span className="ml-2 text-zinc-600 text-xs italic">{ex.exercise_notes}</span>}
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => startEditEx(ex)} className="text-zinc-500 hover:text-zinc-200 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteExercise(ex.template_id, ex.id)} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add exercise row */}
              <div className="pt-2 space-y-2">
                <LibraryPicker library={libraryExercises} onPick={lib => pickForNew(template.id, lib)} placeholder="Add from library…" />
                <div className="flex items-center gap-2">
                  {getNew(template.id).libraryId && (
                    <ExerciseDiagram imageUrl={libById(getNew(template.id).libraryId)?.image_url} name={getNew(template.id).name} size="sm" />
                  )}
                  <Input
                    value={getNew(template.id).name}
                    onChange={e => patchNew(template.id, { name: e.target.value, libraryId: null })}
                    onKeyDown={(e) => e.key === 'Enter' && addExercise(template.id)}
                    placeholder="…or type a custom exercise name"
                    className={inputCls}
                  />
                </div>
                <SetSchemeEditor value={getNew(template.id).scheme} onChange={scheme => patchNew(template.id, { scheme })} />
                <div className="flex gap-2">
                  <Input value={getNew(template.id).notes} onChange={e => patchNew(template.id, { notes: e.target.value })} placeholder="Client-specific notes (optional)" className={`${inputCls} flex-1`} />
                  <Button size="sm" onClick={() => addExercise(template.id)} disabled={!getNew(template.id).name.trim()} className="bg-white text-black hover:bg-zinc-200 h-8 px-3 text-xs shrink-0">
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
