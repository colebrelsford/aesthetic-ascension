'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronUp, Dumbbell, Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Profile } from '@/lib/types'

interface Exercise {
  name: string
  sets: string
  reps: string
  notes: string
}

interface CoachTemplate {
  id: string
  coach_id: string
  name: string
  exercises: Exercise[]
  created_at: string
}

interface Props {
  coachId: string
  clients: Profile[]
}

const cardStyle = { background: '#111', border: '1px solid rgba(201,168,76,0.15)' }
const inputStyle = { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(201,168,76,0.2)', color: 'white' }

export default function CoachTemplates({ coachId, clients }: Props) {
  const [templates, setTemplates] = useState<CoachTemplate[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newExercises, setNewExercises] = useState<Exercise[]>([{ name: '', sets: '', reps: '', notes: '' }])
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('coach_templates')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setTemplates(data as CoachTemplate[]) })
  }, [coachId])

  function updateExercise(i: number, field: keyof Exercise, val: string) {
    setNewExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: val } : ex))
  }

  async function saveTemplate() {
    const validExercises = newExercises.filter(e => e.name.trim())
    if (!newName.trim()) { toast.error('Enter a template name'); return }
    if (!validExercises.length) { toast.error('Add at least one exercise'); return }
    setSaving(true)

    const { data, error } = await supabase
      .from('coach_templates')
      .insert({ coach_id: coachId, name: newName.trim(), exercises: validExercises })
      .select()
      .single()

    setSaving(false)
    if (error) { toast.error('Failed to save'); return }
    setTemplates(prev => [data as CoachTemplate, ...prev])
    setCreating(false)
    setNewName('')
    setNewExercises([{ name: '', sets: '', reps: '', notes: '' }])
    toast.success('Template saved!')
  }

  async function deleteTemplate(id: string) {
    await supabase.from('coach_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    toast.success('Template deleted')
  }

  async function assignToClient(template: CoachTemplate, clientId: string) {
    setAssigning(template.id)

    // Create the workout_template for the client
    const { data: wt, error: wtErr } = await supabase
      .from('workout_templates')
      .insert({ client_id: clientId, name: template.name, display_order: 99 })
      .select()
      .single()

    if (wtErr || !wt) { toast.error('Failed to assign'); setAssigning(null); return }

    // Insert each exercise
    const exerciseRows = template.exercises.map((ex, i) => ({
      template_id: wt.id,
      client_id: clientId,
      name: ex.name,
      display_order: i,
    }))

    const { error: exErr } = await supabase.from('workout_exercises').insert(exerciseRows)
    setAssigning(null)
    if (exErr) { toast.error('Failed to assign exercises'); return }

    const clientName = clients.find(c => c.id === clientId)?.full_name || 'Client'
    toast.success(`"${template.name}" assigned to ${clientName}!`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
            <Dumbbell className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          </div>
          <h3 className="font-semibold text-white text-sm">Workout Templates</h3>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#000' }}
          >
            <Plus className="w-3.5 h-3.5" /> New template
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
          <div className="space-y-1.5">
            <label className="text-[#666] text-xs uppercase tracking-wider">Template name</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Push Day A, Full Body, Leg Day"
              className="rounded-xl text-white"
              style={inputStyle}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[#666] text-xs uppercase tracking-wider">Exercises</label>
            {newExercises.map((ex, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_60px_1fr_28px] gap-2 items-center">
                <Input value={ex.name} onChange={e => updateExercise(i, 'name', e.target.value)} placeholder="Exercise name" className="rounded-lg text-white text-xs h-8" style={inputStyle} />
                <Input value={ex.sets} onChange={e => updateExercise(i, 'sets', e.target.value)} placeholder="Sets" className="rounded-lg text-white text-xs h-8" style={inputStyle} />
                <Input value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} placeholder="Reps" className="rounded-lg text-white text-xs h-8" style={inputStyle} />
                <Input value={ex.notes} onChange={e => updateExercise(i, 'notes', e.target.value)} placeholder="Notes (optional)" className="rounded-lg text-white text-xs h-8" style={inputStyle} />
                {newExercises.length > 1 && (
                  <button onClick={() => setNewExercises(prev => prev.filter((_, idx) => idx !== i))} className="text-[#555] hover:text-red-400 flex justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setNewExercises(prev => [...prev, { name: '', sets: '', reps: '', notes: '' }])}
              className="flex items-center gap-1.5 text-xs text-[#666] hover:text-[#aaa] transition-colors mt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add exercise
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={saveTemplate} disabled={saving} className="flex-1 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
              {saving ? 'Saving…' : 'Save template'}
            </button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-xl text-sm text-[#666] hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      {templates.length === 0 && !creating ? (
        <div className="rounded-2xl text-[#555] text-sm text-center py-12" style={{ border: '1px dashed rgba(201,168,76,0.15)' }}>
          No templates yet — create your first one above.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="rounded-2xl overflow-hidden" style={cardStyle}>
              <button
                className="w-full flex items-center justify-between px-4 py-3"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              >
                <span className="text-white text-sm font-medium">{t.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#555] text-xs">{t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}</span>
                  {expanded === t.id ? <ChevronUp className="w-4 h-4 text-[#555]" /> : <ChevronDown className="w-4 h-4 text-[#555]" />}
                </div>
              </button>

              {expanded === t.id && (
                <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Exercise list */}
                  <div className="pt-3 space-y-1">
                    {t.exercises.map((ex, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <span className="text-[#555] w-4">{i + 1}.</span>
                        <span className="text-white font-medium flex-1">{ex.name}</span>
                        {ex.sets && <span className="text-[#888]">{ex.sets} sets</span>}
                        {ex.reps && <span className="text-[#888]">× {ex.reps}</span>}
                        {ex.notes && <span className="text-[#555] italic">{ex.notes}</span>}
                      </div>
                    ))}
                  </div>

                  {/* Assign to client */}
                  {clients.length > 0 && (
                    <div>
                      <p className="text-[#555] text-xs mb-2">Assign to client</p>
                      <div className="flex flex-wrap gap-2">
                        {clients.map(c => (
                          <button
                            key={c.id}
                            onClick={() => assignToClient(t, c.id)}
                            disabled={assigning === t.id}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition-all hover:border-[rgba(201,168,76,0.4)]"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa' }}
                          >
                            <Send className="w-3 h-3" />
                            {c.full_name.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="flex items-center gap-1.5 text-xs text-[#444] hover:text-red-400 transition-colors"
                  >
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
