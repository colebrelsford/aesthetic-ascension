'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronUp, Dumbbell, Send, Pencil, X, Check, Pill, UtensilsCrossed } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Profile } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── Shared styles ─────────────────────────────────────────────────────────
const cardStyle = { background: '#111', border: '1px solid rgba(201,168,76,0.15)' }
const inputStyle = { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(201,168,76,0.2)', color: 'white' }
const TAB_CLASS = `text-[#666] text-xs font-medium rounded-lg px-3 py-1.5 transition-all
  data-[state=active]:text-black data-[state=active]:font-semibold`

const TIMINGS = ['AM', 'With food', 'Pre-workout', 'Post-workout', 'PM', 'Before bed', 'As needed']
const FREQUENCIES = ['Daily', '6x/week', '5x/week', '3x/week (M/W/F)', '2x/week', 'Weekly', 'Cycle', 'As needed']

interface Props {
  coachId: string
  clients: Profile[]
}

// ══════════════════════════════════════════════════════════════════════════════
// WORKOUT TEMPLATES TAB
// ══════════════════════════════════════════════════════════════════════════════

interface Exercise {
  id?: string
  name: string
  sets: string
  reps: string
  notes: string
}

interface WorkoutDay {
  id?: string
  name: string
  exercises: Exercise[]
}

interface WorkoutProgram {
  id: string
  coach_id: string
  name: string
  created_at: string
  days?: WorkoutDay[]
}

function ExerciseForm({ exercises, onChange }: { exercises: Exercise[]; onChange: (e: Exercise[]) => void }) {
  function update(i: number, field: keyof Exercise, val: string) {
    onChange(exercises.map((ex, idx) => idx === i ? { ...ex, [field]: val } : ex))
  }
  return (
    <div className="space-y-2">
      {exercises.map((ex, i) => (
        <div key={i} className="grid grid-cols-[1fr_56px_56px_1fr_24px] gap-2 items-center">
          <Input value={ex.name} onChange={e => update(i, 'name', e.target.value)} placeholder="Exercise" className="rounded-lg text-white text-xs h-8" style={inputStyle} />
          <Input value={ex.sets} onChange={e => update(i, 'sets', e.target.value)} placeholder="Sets" className="rounded-lg text-white text-xs h-8" style={inputStyle} />
          <Input value={ex.reps} onChange={e => update(i, 'reps', e.target.value)} placeholder="Reps" className="rounded-lg text-white text-xs h-8" style={inputStyle} />
          <Input value={ex.notes} onChange={e => update(i, 'notes', e.target.value)} placeholder="Notes" className="rounded-lg text-white text-xs h-8" style={inputStyle} />
          {exercises.length > 1 && (
            <button onClick={() => onChange(exercises.filter((_, idx) => idx !== i))} className="text-[#555] hover:text-red-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button onClick={() => onChange([...exercises, { name: '', sets: '', reps: '', notes: '' }])} className="flex items-center gap-1.5 text-xs text-[#666] hover:text-[#aaa] mt-1">
        <Plus className="w-3.5 h-3.5" /> Add exercise
      </button>
    </div>
  )
}

function WorkoutTemplatesTab({ coachId, clients }: Props) {
  const [programs, setPrograms] = useState<WorkoutProgram[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDays, setNewDays] = useState<WorkoutDay[]>([{ name: '', exercises: [{ name: '', sets: '', reps: '', notes: '' }] }])
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDays, setEditDays] = useState<WorkoutDay[]>([])
  const [editSaving, setEditSaving] = useState(false)
  const supabase = createClient()

  async function loadPrograms() {
    const { data: progs } = await supabase
      .from('coach_workout_programs')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
    if (!progs) return
    const ids = progs.map(p => p.id)
    const { data: days } = await supabase
      .from('coach_workout_program_days')
      .select('*, coach_workout_program_exercises(*)')
      .in('program_id', ids)
      .order('display_order')
    const progMap = progs.map(p => ({
      ...p,
      days: (days || [])
        .filter(d => d.program_id === p.id)
        .map(d => ({
          id: d.id,
          name: d.name,
          exercises: (d.coach_workout_program_exercises || [])
            .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)
            .map((e: { id: string; name: string; sets: string; reps: string; notes: string }) => ({ id: e.id, name: e.name, sets: e.sets || '', reps: e.reps || '', notes: e.notes || '' })),
        })),
    }))
    setPrograms(progMap)
  }

  useEffect(() => { loadPrograms() }, [coachId])

  function startEdit(prog: WorkoutProgram) {
    setEditingId(prog.id)
    setEditName(prog.name)
    setEditDays((prog.days || []).map(d => ({ ...d, exercises: d.exercises.map(e => ({ ...e })) })))
    setExpanded(prog.id)
  }

  async function saveEdit(progId: string) {
    if (!editName.trim()) { toast.error('Enter a program name'); return }
    const validDays = editDays.filter(d => d.name.trim())
    if (!validDays.length) { toast.error('Add at least one day'); return }
    setEditSaving(true)

    // Update program name
    await supabase.from('coach_workout_programs').update({ name: editName.trim() }).eq('id', progId)

    // Delete all existing days (cascade deletes exercises)
    await supabase.from('coach_workout_program_days').delete().eq('program_id', progId)

    // Re-insert days and exercises
    for (let i = 0; i < validDays.length; i++) {
      const d = validDays[i]
      const { data: day } = await supabase
        .from('coach_workout_program_days')
        .insert({ program_id: progId, name: d.name.trim(), display_order: i })
        .select().single()
      if (day) {
        const exRows = d.exercises.filter(e => e.name.trim()).map((e, j) => ({
          day_id: day.id, name: e.name.trim(), sets: e.sets, reps: e.reps, notes: e.notes, display_order: j,
        }))
        if (exRows.length) await supabase.from('coach_workout_program_exercises').insert(exRows)
      }
    }

    setEditSaving(false)
    setEditingId(null)
    toast.success('Program updated!')
    loadPrograms()
  }

  async function saveProgram() {
    if (!newName.trim()) { toast.error('Enter a program name'); return }
    const validDays = newDays.filter(d => d.name.trim())
    if (!validDays.length) { toast.error('Add at least one day'); return }
    setSaving(true)
    const { data: prog, error } = await supabase
      .from('coach_workout_programs')
      .insert({ coach_id: coachId, name: newName.trim() })
      .select().single()
    if (error || !prog) { toast.error('Failed to save'); setSaving(false); return }
    for (let i = 0; i < validDays.length; i++) {
      const d = validDays[i]
      const { data: day } = await supabase
        .from('coach_workout_program_days')
        .insert({ program_id: prog.id, name: d.name.trim(), display_order: i })
        .select().single()
      if (day) {
        const exRows = d.exercises.filter(e => e.name.trim()).map((e, j) => ({
          day_id: day.id, name: e.name.trim(), sets: e.sets, reps: e.reps, notes: e.notes, display_order: j,
        }))
        if (exRows.length) await supabase.from('coach_workout_program_exercises').insert(exRows)
      }
    }
    setSaving(false)
    toast.success('Program saved!')
    setCreating(false)
    setNewName('')
    setNewDays([{ name: '', exercises: [{ name: '', sets: '', reps: '', notes: '' }] }])
    loadPrograms()
  }

  async function deleteProgram(id: string) {
    await supabase.from('coach_workout_programs').delete().eq('id', id)
    setPrograms(prev => prev.filter(p => p.id !== id))
    toast.success('Program deleted')
  }

  async function assignToClient(prog: WorkoutProgram, clientId: string) {
    setAssigning(prog.id)
    const days = prog.days || []
    for (const day of days) {
      const { data: wt } = await supabase
        .from('workout_templates')
        .insert({ client_id: clientId, name: day.name, display_order: 99 })
        .select().single()
      if (wt && day.exercises.length) {
        await supabase.from('workout_exercises').insert(
          day.exercises.filter(e => e.name.trim()).map((e, i) => ({
            template_id: wt.id,
            client_id: clientId,
            name: e.name,
            display_order: i,
            target_sets: e.sets ? parseInt(e.sets) : null,
            target_reps: e.reps || null,
            exercise_notes: e.notes || null,
          }))
        )
      }
    }
    setAssigning(null)
    const clientName = clients.find(c => c.id === clientId)?.full_name || 'Client'
    toast.success(`"${prog.name}" assigned to ${clientName}!`)
  }

  const totalExercises = (prog: WorkoutProgram) =>
    (prog.days || []).reduce((sum, d) => sum + d.exercises.length, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
            <Dumbbell className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          </div>
          <h3 className="font-semibold text-white text-sm">Workout Programs</h3>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#000' }}>
            <Plus className="w-3.5 h-3.5" /> New program
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
          <div className="space-y-1.5">
            <label className="text-[#666] text-xs uppercase tracking-wider">Program name</label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. 4-Day Upper/Lower Split" className="rounded-xl text-white" style={inputStyle} />
          </div>
          {newDays.map((day, di) => (
            <div key={di} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <Input value={day.name} onChange={e => setNewDays(newDays.map((d, i) => i === di ? { ...d, name: e.target.value } : d))}
                  placeholder={`Day ${di + 1} name (e.g. Push Day)`} className="rounded-lg text-white text-sm flex-1" style={inputStyle} />
                {newDays.length > 1 && (
                  <button onClick={() => setNewDays(newDays.filter((_, i) => i !== di))} className="text-[#555] hover:text-red-400 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <ExerciseForm exercises={day.exercises} onChange={exs => setNewDays(newDays.map((d, i) => i === di ? { ...d, exercises: exs } : d))} />
            </div>
          ))}
          <button onClick={() => setNewDays([...newDays, { name: '', exercises: [{ name: '', sets: '', reps: '', notes: '' }] }])}
            className="flex items-center gap-1.5 text-xs text-[#C9A84C] hover:text-[#E8C97A]">
            <Plus className="w-3.5 h-3.5" /> Add day
          </button>
          <div className="flex gap-2 pt-1">
            <button onClick={saveProgram} disabled={saving} className="flex-1 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
              {saving ? 'Saving…' : 'Save program'}
            </button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-xl text-sm text-[#666] hover:text-white" style={{ background: 'rgba(255,255,255,0.04)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {programs.length === 0 && !creating ? (
        <div className="rounded-2xl text-[#555] text-sm text-center py-12" style={{ border: '1px dashed rgba(201,168,76,0.15)' }}>
          No workout programs yet — create your first one above.
        </div>
      ) : (
        <div className="space-y-2">
          {programs.map(prog => (
            <div key={prog.id} className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="flex items-center justify-between px-4 py-3">
                <button className="flex-1 text-left" onClick={() => { if (editingId !== prog.id) setExpanded(expanded === prog.id ? null : prog.id) }}>
                  <span className="text-white text-sm font-medium">{prog.name}</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[#555] text-xs">{(prog.days || []).length} day{(prog.days || []).length !== 1 ? 's' : ''}</span>
                  <button onClick={() => editingId === prog.id ? setEditingId(null) : startEdit(prog)}
                    className="p-1 rounded-lg transition-colors" style={{ color: editingId === prog.id ? '#C9A84C' : '#555' }} title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {expanded === prog.id ? <ChevronUp className="w-4 h-4 text-[#555]" /> : <ChevronDown className="w-4 h-4 text-[#555]" />}
                </div>
              </div>

              {expanded === prog.id && (
                <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {editingId === prog.id ? (
                    /* ── Edit mode ── */
                    <div className="pt-3 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[#666] text-xs uppercase tracking-wider">Program name</label>
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="rounded-xl text-white" style={inputStyle} />
                      </div>
                      {editDays.map((day, di) => (
                        <div key={di} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center gap-2">
                            <Input value={day.name}
                              onChange={e => setEditDays(editDays.map((d, i) => i === di ? { ...d, name: e.target.value } : d))}
                              placeholder="Day name" className="rounded-lg text-white text-sm flex-1" style={inputStyle} />
                            {editDays.length > 1 && (
                              <button onClick={() => setEditDays(editDays.filter((_, i) => i !== di))} className="text-[#555] hover:text-red-400 p-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <ExerciseForm
                            exercises={day.exercises}
                            onChange={exs => setEditDays(editDays.map((d, i) => i === di ? { ...d, exercises: exs } : d))}
                          />
                        </div>
                      ))}
                      <button onClick={() => setEditDays([...editDays, { name: '', exercises: [{ name: '', sets: '', reps: '', notes: '' }] }])}
                        className="flex items-center gap-1.5 text-xs text-[#C9A84C] hover:text-[#E8C97A]">
                        <Plus className="w-3.5 h-3.5" /> Add day
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(prog.id)} disabled={editSaving}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-black disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
                          <Check className="w-3.5 h-3.5" /> {editSaving ? 'Saving…' : 'Save changes'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs text-[#666] hover:text-white" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── View mode ── */
                    <>
                      <div className="pt-3 space-y-2">
                        {(prog.days || []).map((day, di) => (
                          <div key={di} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <p className="text-[#C9A84C] text-xs font-semibold mb-2">{day.name}</p>
                            {day.exercises.map((ex, ei) => (
                              <div key={ei} className="flex items-center gap-3 text-xs py-0.5">
                                <span className="text-[#555] w-4">{ei + 1}.</span>
                                <span className="text-white font-medium flex-1">{ex.name}</span>
                                {ex.sets && <span className="text-[#888]">{ex.sets}×{ex.reps}</span>}
                                {ex.notes && <span className="text-[#555] italic truncate max-w-[160px]">{ex.notes}</span>}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      {clients.length > 0 && (
                        <div>
                          <p className="text-[#555] text-xs mb-2">Assign to client</p>
                          <div className="flex flex-wrap gap-2">
                            {clients.map(c => (
                              <button key={c.id} onClick={() => assignToClient(prog, c.id)} disabled={assigning === prog.id}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa' }}>
                                <Send className="w-3 h-3" />
                                {c.full_name.split(' ')[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <button onClick={() => deleteProgram(prog.id)} className="flex items-center gap-1.5 text-xs text-[#444] hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" /> Delete program
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SUPPLEMENT STACK TEMPLATES TAB
// ══════════════════════════════════════════════════════════════════════════════

interface SupplementItem {
  id?: string
  name: string
  brand: string
  dosage: string
  timing: string
  frequency: string
  notes: string
}

interface SupplementStack {
  id: string
  name: string
  created_at: string
  items?: SupplementItem[]
}

const blankSupp = (): SupplementItem => ({ name: '', brand: '', dosage: '', timing: 'AM', frequency: 'Daily', notes: '' })

function SupplementStacksTab({ coachId, clients }: Props) {
  const [stacks, setStacks] = useState<SupplementStack[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newItems, setNewItems] = useState<SupplementItem[]>([blankSupp()])
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('supplement_stack_templates')
        .select('*, supplement_stack_template_items(*)')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })
      if (data) setStacks(data.map(s => ({
        ...s,
        items: (s.supplement_stack_template_items || []).sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order),
      })))
    }
    load()
  }, [coachId])

  async function saveStack() {
    if (!newName.trim()) { toast.error('Enter a stack name'); return }
    const valid = newItems.filter(i => i.name.trim())
    if (!valid.length) { toast.error('Add at least one supplement'); return }
    setSaving(true)
    const { data: stack, error } = await supabase
      .from('supplement_stack_templates')
      .insert({ coach_id: coachId, name: newName.trim() })
      .select().single()
    if (error || !stack) { toast.error('Failed to save'); setSaving(false); return }
    await supabase.from('supplement_stack_template_items').insert(
      valid.map((item, i) => ({ stack_id: stack.id, ...item, display_order: i }))
    )
    setSaving(false)
    toast.success('Stack saved!')
    setCreating(false)
    setNewName('')
    setNewItems([blankSupp()])
    const { data: refreshed } = await supabase
      .from('supplement_stack_templates')
      .select('*, supplement_stack_template_items(*)')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
    if (refreshed) setStacks(refreshed.map(s => ({ ...s, items: s.supplement_stack_template_items || [] })))
  }

  async function deleteStack(id: string) {
    await supabase.from('supplement_stack_templates').delete().eq('id', id)
    setStacks(prev => prev.filter(s => s.id !== id))
    toast.success('Stack deleted')
  }

  async function assignToClient(stack: SupplementStack, clientId: string) {
    setAssigning(stack.id)
    const items = stack.items || []
    if (items.length) {
      const { data: existing } = await supabase
        .from('client_supplements')
        .select('display_order')
        .eq('client_id', clientId)
        .order('display_order', { ascending: false })
        .limit(1)
      const startOrder = existing && existing.length > 0 ? (existing[0].display_order ?? 0) + 1 : 0
      await supabase.from('client_supplements').insert(
        items.map((item, i) => ({
          client_id: clientId,
          coach_id: coachId,
          name: item.name,
          brand: item.brand || null,
          dosage: item.dosage || null,
          timing: item.timing,
          frequency: item.frequency,
          notes: item.notes || null,
          display_order: startOrder + i,
        }))
      )
    }
    setAssigning(null)
    const clientName = clients.find(c => c.id === clientId)?.full_name || 'Client'
    toast.success(`"${stack.name}" assigned to ${clientName}!`)
  }

  function updateItem(i: number, field: keyof SupplementItem, val: string) {
    setNewItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
            <Pill className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          </div>
          <h3 className="font-semibold text-white text-sm">Supplement Stacks</h3>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#000' }}>
            <Plus className="w-3.5 h-3.5" /> New stack
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
          <div className="space-y-1.5">
            <label className="text-[#666] text-xs uppercase tracking-wider">Stack name</label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Natural Bulk Stack, Contest Prep Protocol" className="rounded-xl text-white" style={inputStyle} />
          </div>
          <div className="space-y-3">
            <label className="text-[#666] text-xs uppercase tracking-wider">Supplements</label>
            {newItems.map((item, i) => (
              <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Supplement name" className="rounded-lg text-white text-xs h-8" style={inputStyle} />
                  <Input value={item.brand} onChange={e => updateItem(i, 'brand', e.target.value)} placeholder="Brand (optional)" className="rounded-lg text-white text-xs h-8" style={inputStyle} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input value={item.dosage} onChange={e => updateItem(i, 'dosage', e.target.value)} placeholder="Dosage" className="rounded-lg text-white text-xs h-8" style={inputStyle} />
                  <select value={item.timing} onChange={e => updateItem(i, 'timing', e.target.value)} className="rounded-lg text-xs h-8 px-2" style={{ ...inputStyle, border: '1px solid rgba(201,168,76,0.2)' }}>
                    {TIMINGS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={item.frequency} onChange={e => updateItem(i, 'frequency', e.target.value)} className="rounded-lg text-xs h-8 px-2" style={{ ...inputStyle, border: '1px solid rgba(201,168,76,0.2)' }}>
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Input value={item.notes} onChange={e => updateItem(i, 'notes', e.target.value)} placeholder="Notes (optional)" className="rounded-lg text-white text-xs h-8 flex-1" style={inputStyle} />
                  {newItems.length > 1 && (
                    <button onClick={() => setNewItems(prev => prev.filter((_, idx) => idx !== i))} className="text-[#555] hover:text-red-400 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={() => setNewItems(prev => [...prev, blankSupp()])} className="flex items-center gap-1.5 text-xs text-[#C9A84C] hover:text-[#E8C97A]">
              <Plus className="w-3.5 h-3.5" /> Add supplement
            </button>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={saveStack} disabled={saving} className="flex-1 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
              {saving ? 'Saving…' : 'Save stack'}
            </button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-xl text-sm text-[#666] hover:text-white" style={{ background: 'rgba(255,255,255,0.04)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {stacks.length === 0 && !creating ? (
        <div className="rounded-2xl text-[#555] text-sm text-center py-12" style={{ border: '1px dashed rgba(201,168,76,0.15)' }}>
          No supplement stacks yet — create your first one above.
        </div>
      ) : (
        <div className="space-y-2">
          {stacks.map(stack => (
            <div key={stack.id} className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="flex items-center justify-between px-4 py-3">
                <button className="flex-1 text-left" onClick={() => setExpanded(expanded === stack.id ? null : stack.id)}>
                  <span className="text-white text-sm font-medium">{stack.name}</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[#555] text-xs">{(stack.items || []).length} supplement{(stack.items || []).length !== 1 ? 's' : ''}</span>
                  {expanded === stack.id ? <ChevronUp className="w-4 h-4 text-[#555]" /> : <ChevronDown className="w-4 h-4 text-[#555]" />}
                </div>
              </div>
              {expanded === stack.id && (
                <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="pt-3 space-y-1">
                    {(stack.items || []).map((item, i) => (
                      <div key={i} className="flex items-start gap-3 py-1.5 text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-white font-medium">{item.name}</span>
                            {item.dosage && <span className="font-bold" style={{ color: '#C9A84C' }}>{item.dosage}</span>}
                            {item.brand && <span className="text-[#555]">· {item.brand}</span>}
                          </div>
                          <div className="text-[#666] mt-0.5">{item.timing} · {item.frequency}{item.notes ? ` · ${item.notes}` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {clients.length > 0 && (
                    <div>
                      <p className="text-[#555] text-xs mb-2">Assign to client</p>
                      <div className="flex flex-wrap gap-2">
                        {clients.map(c => (
                          <button key={c.id} onClick={() => assignToClient(stack, c.id)} disabled={assigning === stack.id}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa' }}>
                            <Send className="w-3 h-3" />
                            {c.full_name.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={() => deleteStack(stack.id)} className="flex items-center gap-1.5 text-xs text-[#444] hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" /> Delete stack
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MEAL PLAN TEMPLATES TAB
// ══════════════════════════════════════════════════════════════════════════════

interface TemplateFood {
  id?: string
  name: string
  qty_grams: string
  protein: string
  carbs: string
  fat: string
  calories: string
  display_qty: string
  display_unit: string
  display_order?: number
}

interface TemplateMeal {
  id?: string
  name: string
  foods: TemplateFood[]
}

interface MealPlanTemplate {
  id: string
  name: string
  created_at: string
  meals?: TemplateMeal[]
}

const blankFood = (): TemplateFood => ({ name: '', qty_grams: '', protein: '', carbs: '', fat: '', calories: '', display_qty: '', display_unit: '', display_order: 0 })
const blankMeal = (): TemplateMeal => ({ name: '', foods: [blankFood()] })

function MealPlanTemplatesTab({ coachId, clients }: Props) {
  const [templates, setTemplates] = useState<MealPlanTemplate[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMeals, setNewMeals] = useState<TemplateMeal[]>([blankMeal()])
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const supabase = createClient()

  async function loadTemplates() {
    const { data } = await supabase
      .from('meal_plan_program_templates')
      .select('*, meal_plan_program_template_meals(*, meal_plan_program_template_foods(*))')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
    if (data) setTemplates(data.map(t => ({
      ...t,
      meals: (t.meal_plan_program_template_meals || [])
        .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)
        .map((m: { id: string; name: string; meal_plan_program_template_foods: TemplateFood[] }) => ({
          id: m.id,
          name: m.name,
          foods: (m.meal_plan_program_template_foods || [])
              .sort((a: { display_order?: number }, b: { display_order?: number }) => ((a.display_order ?? 0) - (b.display_order ?? 0)))
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((f: any) => ({
                id: f.id,
                name: f.name,
                qty_grams: f.qty_grams != null ? String(f.qty_grams) : '',
                protein: f.protein != null ? String(f.protein) : '',
                carbs: f.carbs != null ? String(f.carbs) : '',
                fat: f.fat != null ? String(f.fat) : '',
                calories: f.calories != null ? String(f.calories) : '',
                display_qty: f.display_qty ?? '',
                display_unit: f.display_unit ?? '',
                display_order: f.display_order,
              } as TemplateFood)),
        })),
    })))
  }

  useEffect(() => { loadTemplates() }, [coachId])

  async function saveTemplate() {
    if (!newName.trim()) { toast.error('Enter a template name'); return }
    const validMeals = newMeals.filter(m => m.name.trim())
    if (!validMeals.length) { toast.error('Add at least one meal'); return }
    setSaving(true)
    const { data: tmpl, error } = await supabase
      .from('meal_plan_program_templates')
      .insert({ coach_id: coachId, name: newName.trim() })
      .select().single()
    if (error || !tmpl) { toast.error('Failed to save'); setSaving(false); return }
    for (let mi = 0; mi < validMeals.length; mi++) {
      const meal = validMeals[mi]
      const { data: mealRow } = await supabase
        .from('meal_plan_program_template_meals')
        .insert({ plan_id: tmpl.id, name: meal.name.trim(), display_order: mi })
        .select().single()
      if (mealRow) {
        const validFoods = meal.foods.filter(f => f.name.trim())
        if (validFoods.length) {
          await supabase.from('meal_plan_program_template_foods').insert(
            validFoods.map((f, fi) => ({
              meal_id: mealRow.id,
              name: f.name.trim(),
              qty_grams: f.qty_grams ? parseFloat(f.qty_grams) : null,
              protein: f.protein ? parseFloat(f.protein) : null,
              carbs: f.carbs ? parseFloat(f.carbs) : null,
              fat: f.fat ? parseFloat(f.fat) : null,
              calories: f.calories ? parseFloat(f.calories) : null,
              display_qty: f.display_qty || null,
              display_unit: f.display_unit || null,
              display_order: fi,
            }))
          )
        }
      }
    }
    setSaving(false)
    toast.success('Template saved!')
    setCreating(false)
    setNewName('')
    setNewMeals([blankMeal()])
    loadTemplates()
  }

  async function deleteTemplate(id: string) {
    await supabase.from('meal_plan_program_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    toast.success('Template deleted')
  }

  async function assignToClient(tmpl: MealPlanTemplate, clientId: string) {
    setAssigning(tmpl.id)
    const meals = tmpl.meals || []
    for (let mi = 0; mi < meals.length; mi++) {
      const meal = meals[mi]
      const { data: mealRow } = await supabase
        .from('meal_plans')
        .insert({ client_id: clientId, coach_id: coachId, name: meal.name, display_order: mi })
        .select().single()
      if (mealRow && meal.foods?.length) {
        await supabase.from('meal_plan_foods').insert(
          meal.foods.map((f: TemplateFood, fi: number) => ({
            meal_id: mealRow.id,
            client_id: clientId,
            name: f.name,
            qty_grams: f.qty_grams ? Number(f.qty_grams) : null,
            protein: f.protein ? Number(f.protein) : null,
            carbs: f.carbs ? Number(f.carbs) : null,
            fat: f.fat ? Number(f.fat) : null,
            calories: f.calories ? Number(f.calories) : null,
            display_qty: f.display_qty || null,
            display_unit: f.display_unit || null,
            display_order: fi,
          }))
        )
      }
    }
    setAssigning(null)
    const clientName = clients.find(c => c.id === clientId)?.full_name || 'Client'
    toast.success(`"${tmpl.name}" assigned to ${clientName}!`)
  }

  function updateMealFood(mi: number, fi: number, field: keyof TemplateFood, val: string) {
    setNewMeals(prev => prev.map((m, idx) => idx === mi ? {
      ...m,
      foods: m.foods.map((f, fidx) => fidx === fi ? { ...f, [field]: val } : f),
    } : m))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
            <UtensilsCrossed className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          </div>
          <h3 className="font-semibold text-white text-sm">Meal Plan Templates</h3>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#000' }}>
            <Plus className="w-3.5 h-3.5" /> New template
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
          <div className="space-y-1.5">
            <label className="text-[#666] text-xs uppercase tracking-wider">Template name</label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. 2500 Cal Bulk, Contest Prep Cut" className="rounded-xl text-white" style={inputStyle} />
          </div>
          {newMeals.map((meal, mi) => (
            <div key={mi} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <Input value={meal.name} onChange={e => setNewMeals(newMeals.map((m, i) => i === mi ? { ...m, name: e.target.value } : m))}
                  placeholder={`Meal ${mi + 1} name (e.g. Breakfast)`} className="rounded-lg text-white text-sm flex-1" style={inputStyle} />
                {newMeals.length > 1 && (
                  <button onClick={() => setNewMeals(newMeals.filter((_, i) => i !== mi))} className="text-[#555] hover:text-red-400 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_20px] gap-1.5 text-[10px] text-[#555] px-1">
                  <span>Food</span><span>Grams</span><span>Cal</span><span>Pro</span><span>Carb</span><span>Fat</span><span>Display qty</span><span>Unit</span><span></span>
                </div>
                {meal.foods.map((food, fi) => (
                  <div key={fi} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_20px] gap-1.5 items-center">
                    <Input value={food.name} onChange={e => updateMealFood(mi, fi, 'name', e.target.value)} placeholder="Food name" className="rounded-lg text-white text-xs h-7" style={inputStyle} />
                    <Input value={food.qty_grams} onChange={e => updateMealFood(mi, fi, 'qty_grams', e.target.value)} placeholder="g" className="rounded-lg text-white text-xs h-7" style={inputStyle} />
                    <Input value={food.calories} onChange={e => updateMealFood(mi, fi, 'calories', e.target.value)} placeholder="cal" className="rounded-lg text-white text-xs h-7" style={inputStyle} />
                    <Input value={food.protein} onChange={e => updateMealFood(mi, fi, 'protein', e.target.value)} placeholder="p" className="rounded-lg text-white text-xs h-7" style={inputStyle} />
                    <Input value={food.carbs} onChange={e => updateMealFood(mi, fi, 'carbs', e.target.value)} placeholder="c" className="rounded-lg text-white text-xs h-7" style={inputStyle} />
                    <Input value={food.fat} onChange={e => updateMealFood(mi, fi, 'fat', e.target.value)} placeholder="f" className="rounded-lg text-white text-xs h-7" style={inputStyle} />
                    <Input value={food.display_qty} onChange={e => updateMealFood(mi, fi, 'display_qty', e.target.value)} placeholder="2" className="rounded-lg text-white text-xs h-7" style={inputStyle} />
                    <Input value={food.display_unit} onChange={e => updateMealFood(mi, fi, 'display_unit', e.target.value)} placeholder="eggs" className="rounded-lg text-white text-xs h-7" style={inputStyle} />
                    {meal.foods.length > 1 && (
                      <button onClick={() => setNewMeals(newMeals.map((m, i) => i === mi ? { ...m, foods: m.foods.filter((_, fIdx) => fIdx !== fi) } : m))} className="text-[#555] hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setNewMeals(newMeals.map((m, i) => i === mi ? { ...m, foods: [...m.foods, blankFood()] } : m))}
                  className="flex items-center gap-1.5 text-xs text-[#666] hover:text-[#aaa] mt-1">
                  <Plus className="w-3.5 h-3.5" /> Add food
                </button>
              </div>
            </div>
          ))}
          <button onClick={() => setNewMeals([...newMeals, blankMeal()])} className="flex items-center gap-1.5 text-xs text-[#C9A84C] hover:text-[#E8C97A]">
            <Plus className="w-3.5 h-3.5" /> Add meal
          </button>
          <div className="flex gap-2 pt-1">
            <button onClick={saveTemplate} disabled={saving} className="flex-1 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
              {saving ? 'Saving…' : 'Save template'}
            </button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-xl text-sm text-[#666] hover:text-white" style={{ background: 'rgba(255,255,255,0.04)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 && !creating ? (
        <div className="rounded-2xl text-[#555] text-sm text-center py-12" style={{ border: '1px dashed rgba(201,168,76,0.15)' }}>
          No meal plan templates yet — create your first one above.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(tmpl => (
            <div key={tmpl.id} className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="flex items-center justify-between px-4 py-3">
                <button className="flex-1 text-left" onClick={() => setExpanded(expanded === tmpl.id ? null : tmpl.id)}>
                  <span className="text-white text-sm font-medium">{tmpl.name}</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[#555] text-xs">{(tmpl.meals || []).length} meal{(tmpl.meals || []).length !== 1 ? 's' : ''}</span>
                  {expanded === tmpl.id ? <ChevronUp className="w-4 h-4 text-[#555]" /> : <ChevronDown className="w-4 h-4 text-[#555]" />}
                </div>
              </div>
              {expanded === tmpl.id && (
                <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="pt-3 space-y-2">
                    {(tmpl.meals || []).map((meal, mi) => (
                      <div key={mi} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-[#C9A84C] text-xs font-semibold mb-2">{meal.name}</p>
                        {(meal.foods || []).map((food: TemplateFood, fi: number) => (
                          <div key={fi} className="flex items-center gap-3 text-xs py-0.5">
                            <span className="text-[#555] w-4">{fi + 1}.</span>
                            <span className="text-white font-medium flex-1">{food.name}</span>
                            {(food.display_qty || food.display_unit) ? (
                              <span className="text-[#888]">{food.display_qty} {food.display_unit}</span>
                            ) : food.qty_grams ? (
                              <span className="text-[#888]">{food.qty_grams}g</span>
                            ) : null}
                            {food.calories ? <span className="text-[#666]">{food.calories} cal</span> : null}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  {clients.length > 0 && (
                    <div>
                      <p className="text-[#555] text-xs mb-2">Assign to client</p>
                      <div className="flex flex-wrap gap-2">
                        {clients.map(c => (
                          <button key={c.id} onClick={() => assignToClient(tmpl, c.id)} disabled={assigning === tmpl.id}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa' }}>
                            <Send className="w-3 h-3" />
                            {c.full_name.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={() => deleteTemplate(tmpl.id)} className="flex items-center gap-1.5 text-xs text-[#444] hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" /> Delete template
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function CoachTemplates({ coachId, clients }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-white font-bold text-base">Template Library</h2>
        <span className="text-[#555] text-xs">Build reusable templates and apply them to any client</span>
      </div>
      <Tabs defaultValue="workouts" className="space-y-4">
        <TabsList className="flex gap-1 p-1 rounded-xl h-auto w-fit" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.12)' }}>
          {[
            { value: 'workouts', label: 'Workout Programs' },
            { value: 'supplements', label: 'Supplement Stacks' },
            { value: 'mealplans', label: 'Meal Plans' },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value} className={TAB_CLASS}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="workouts"><WorkoutTemplatesTab coachId={coachId} clients={clients} /></TabsContent>
        <TabsContent value="supplements"><SupplementStacksTab coachId={coachId} clients={clients} /></TabsContent>
        <TabsContent value="mealplans"><MealPlanTemplatesTab coachId={coachId} clients={clients} /></TabsContent>
      </Tabs>
    </div>
  )
}
