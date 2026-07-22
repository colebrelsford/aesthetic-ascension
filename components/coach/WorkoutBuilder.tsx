'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkoutTemplate, WorkoutExercise } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical, Pencil, Check, X } from 'lucide-react'

interface Props {
  clientId: string
}

interface NewExerciseState {
  name: string
  sets: string
  reps: string
  notes: string
}

interface EditExState {
  name: string
  sets: string
  reps: string
  notes: string
}

const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-8 text-sm'

export default function WorkoutBuilder({ clientId }: Props) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [exercises, setExercises] = useState<Record<string, WorkoutExercise[]>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [newDayName, setNewDayName] = useState('')
  const [newExercise, setNewExercise] = useState<Record<string, NewExerciseState>>({})
  const [editingDayId, setEditingDayId] = useState<string | null>(null)
  const [editingDayName, setEditingDayName] = useState('')
  const [editingExId, setEditingExId] = useState<string | null>(null)
  const [editEx, setEditEx] = useState<EditExState>({ name: '', sets: '', reps: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const dragItem = useRef<{ templateId: string; index: number } | null>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [clientId])

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
    return newExercise[templateId] || { name: '', sets: '', reps: '', notes: '' }
  }

  function setNew(templateId: string, field: keyof NewExerciseState, val: string) {
    setNewExercise(prev => ({ ...prev, [templateId]: { ...getNew(templateId), [field]: val } }))
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
      target_sets: n.sets ? parseInt(n.sets) : null,
      target_reps: n.reps || null,
      exercise_notes: n.notes || null,
    }).select().single()
    if (error) { toast.error('Failed to add exercise'); return }
    setExercises(prev => ({ ...prev, [templateId]: [...(prev[templateId] || []), data] }))
    setNewExercise(prev => ({ ...prev, [templateId]: { name: '', sets: '', reps: '', notes: '' } }))
  }

  function startEditEx(ex: WorkoutExercise) {
    setEditingExId(ex.id)
    setEditEx({
      name: ex.name,
      sets: ex.target_sets?.toString() || '',
      reps: ex.target_reps || '',
      notes: ex.exercise_notes || '',
    })
  }

  async function saveEditEx(templateId: string, exId: string) {
    if (!editEx.name.trim()) return
    const { data, error } = await supabase.from('workout_exercises').update({
      name: editEx.name.trim(),
      target_sets: editEx.sets ? parseInt(editEx.sets) : null,
      target_reps: editEx.reps || null,
      exercise_notes: editEx.notes || null,
    }).eq('id', exId).select().single()
    if (error) { toast.error('Failed to save'); return }
    setExercises(prev => ({ ...prev, [templateId]: prev[templateId].map(e => e.id === exId ? data : e) }))
    setEditingExId(null)
    toast.success('Exercise updated')
  }

  async function deleteExercise(templateId: string, exerciseId: string) {
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
                    <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
                      <div className="grid grid-cols-[1fr_60px_80px] gap-2">
                        <Input value={editEx.name} onChange={e => setEditEx(p => ({ ...p, name: e.target.value }))} placeholder="Exercise name" className={inputCls} />
                        <Input value={editEx.sets} onChange={e => setEditEx(p => ({ ...p, sets: e.target.value }))} placeholder="Sets" className={inputCls} type="number" />
                        <Input value={editEx.reps} onChange={e => setEditEx(p => ({ ...p, reps: e.target.value }))} placeholder="Reps" className={inputCls} />
                      </div>
                      <Input value={editEx.notes} onChange={e => setEditEx(p => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)" className={inputCls} />
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
                      <div className="flex-1 min-w-0">
                        <span className="text-zinc-200 text-sm">{ex.name}</span>
                        {(ex.target_sets || ex.target_reps) && (
                          <span className="ml-2 text-xs" style={{ color: '#C9A84C' }}>
                            {ex.target_sets ? `${ex.target_sets} sets` : ''}{ex.target_sets && ex.target_reps ? ' × ' : ''}{ex.target_reps || ''}
                          </span>
                        )}
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
                <div className="grid grid-cols-[1fr_60px_80px] gap-2">
                  <Input value={getNew(template.id).name} onChange={e => setNew(template.id, 'name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addExercise(template.id)} placeholder="Exercise name..." className={inputCls} />
                  <Input value={getNew(template.id).sets} onChange={e => setNew(template.id, 'sets', e.target.value)} placeholder="Sets" className={inputCls} type="number" />
                  <Input value={getNew(template.id).reps} onChange={e => setNew(template.id, 'reps', e.target.value)} placeholder="Reps" className={inputCls} />
                </div>
                <div className="flex gap-2">
                  <Input value={getNew(template.id).notes} onChange={e => setNew(template.id, 'notes', e.target.value)} placeholder="Notes (optional)" className={`${inputCls} flex-1`} />
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
