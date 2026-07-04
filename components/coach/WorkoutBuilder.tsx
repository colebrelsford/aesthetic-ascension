'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkoutTemplate, WorkoutExercise } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'

interface Props {
  clientId: string
}

export default function WorkoutBuilder({ clientId }: Props) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [exercises, setExercises] = useState<Record<string, WorkoutExercise[]>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [newDayName, setNewDayName] = useState('')
  const [newExercise, setNewExercise] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [clientId])

  async function load() {
    const { data: tmpl } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('client_id', clientId)
      .order('display_order')

    if (!tmpl) return
    setTemplates(tmpl)

    const { data: exs } = await supabase
      .from('workout_exercises')
      .select('*')
      .eq('client_id', clientId)
      .order('display_order')

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
    const { data, error } = await supabase
      .from('workout_templates')
      .insert({ client_id: clientId, name: newDayName.trim(), display_order: templates.length })
      .select()
      .single()
    setLoading(false)
    if (error) { toast.error('Failed to add workout day'); return }
    setTemplates(prev => [...prev, data])
    setExpanded(prev => ({ ...prev, [data.id]: true }))
    setNewDayName('')
    toast.success('Workout day added')
  }

  async function deleteDay(id: string) {
    await supabase.from('workout_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    setExercises(prev => { const n = { ...prev }; delete n[id]; return n })
    toast.success('Workout day removed')
  }

  async function addExercise(templateId: string) {
    const name = newExercise[templateId]?.trim()
    if (!name) return
    const order = (exercises[templateId] || []).length
    const { data, error } = await supabase
      .from('workout_exercises')
      .insert({ template_id: templateId, client_id: clientId, name, display_order: order })
      .select()
      .single()
    if (error) { toast.error('Failed to add exercise'); return }
    setExercises(prev => ({ ...prev, [templateId]: [...(prev[templateId] || []), data] }))
    setNewExercise(prev => ({ ...prev, [templateId]: '' }))
  }

  async function deleteExercise(templateId: string, exerciseId: string) {
    await supabase.from('workout_exercises').delete().eq('id', exerciseId)
    setExercises(prev => ({
      ...prev,
      [templateId]: prev[templateId].filter(e => e.id !== exerciseId)
    }))
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="font-medium text-white text-sm mb-3">Add Workout Day</h3>
        <div className="flex gap-2">
          <Input
            value={newDayName}
            onChange={(e) => setNewDayName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDay()}
            placeholder="e.g. Push Day, Pull Day, Legs..."
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
          />
          <Button
            onClick={addDay}
            disabled={loading || !newDayName.trim()}
            className="bg-white text-black hover:bg-zinc-200 shrink-0"
          >
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
            <button
              onClick={() => setExpanded(prev => ({ ...prev, [template.id]: !prev[template.id] }))}
              className="flex items-center gap-2 text-white font-medium text-sm flex-1 text-left"
            >
              {expanded[template.id]
                ? <ChevronDown className="w-4 h-4 text-zinc-400" />
                : <ChevronRight className="w-4 h-4 text-zinc-400" />
              }
              {template.name}
              <span className="text-zinc-500 text-xs font-normal">
                ({(exercises[template.id] || []).length} exercises)
              </span>
            </button>
            <button
              onClick={() => deleteDay(template.id)}
              className="text-zinc-600 hover:text-red-400 transition-colors ml-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {expanded[template.id] && (
            <div className="p-4 space-y-3">
              {(exercises[template.id] || []).map(ex => (
                <div key={ex.id} className="flex items-center gap-2 group">
                  <GripVertical className="w-4 h-4 text-zinc-700" />
                  <span className="text-zinc-200 text-sm flex-1">{ex.name}</span>
                  <button
                    onClick={() => deleteExercise(template.id, ex.id)}
                    className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <Input
                  value={newExercise[template.id] || ''}
                  onChange={(e) => setNewExercise(prev => ({ ...prev, [template.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && addExercise(template.id)}
                  placeholder="Add exercise..."
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-8 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => addExercise(template.id)}
                  disabled={!newExercise[template.id]?.trim()}
                  className="bg-white text-black hover:bg-zinc-200 h-8 px-3 text-xs shrink-0"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
