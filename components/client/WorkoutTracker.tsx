'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkoutTemplate, WorkoutExercise, SetLog } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ChevronRight, ArrowLeft, Plus, Trash2, Dumbbell } from 'lucide-react'

interface Props {
  clientId: string
}

interface ExerciseWithHistory extends WorkoutExercise {
  lastSets: SetLog[]
}

export default function WorkoutTracker({ clientId }: Props) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)
  const [exercises, setExercises] = useState<ExerciseWithHistory[]>([])
  const [sets, setSets] = useState<Record<string, { weight: string; reps: string }[]>>({})
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('workout_templates')
      .select('*')
      .eq('client_id', clientId)
      .order('display_order')
      .then(({ data }) => { if (data) setTemplates(data) })
  }, [clientId])

  async function selectWorkout(template: WorkoutTemplate) {
    setLoading(true)
    setSelectedTemplate(template)

    const { data: exs } = await supabase
      .from('workout_exercises')
      .select('*')
      .eq('template_id', template.id)
      .order('display_order')

    if (!exs) { setLoading(false); return }

    // Get last session's set logs for each exercise
    const exercisesWithHistory: ExerciseWithHistory[] = []
    for (const ex of exs) {
      const { data: lastSession } = await supabase
        .from('set_logs')
        .select('*')
        .eq('client_id', clientId)
        .eq('exercise_name', ex.name)
        .order('created_at', { ascending: false })
        .limit(10)

      exercisesWithHistory.push({ ...ex, lastSets: lastSession || [] })
    }

    setExercises(exercisesWithHistory)

    // Initialize empty sets for today
    const initSets: Record<string, { weight: string; reps: string }[]> = {}
    for (const ex of exs) {
      initSets[ex.id] = [{ weight: '', reps: '' }]
    }
    setSets(initSets)

    // Get or create today's session
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('client_id', clientId)
      .eq('session_date', today)
      .single()

    if (existing) {
      setSessionId(existing.id)
      // Load any sets already logged today for this workout
      const { data: todaySets } = await supabase
        .from('set_logs')
        .select('*')
        .eq('session_id', existing.id)
        .eq('client_id', clientId)

      if (todaySets && todaySets.length > 0) {
        const loadedSets: Record<string, { weight: string; reps: string }[]> = {}
        for (const ex of exs) {
          const exSets = todaySets.filter(s => s.exercise_name === ex.name)
          if (exSets.length > 0) {
            loadedSets[ex.id] = exSets
              .sort((a, b) => a.set_number - b.set_number)
              .map(s => ({ weight: s.weight_lbs?.toString() || '', reps: s.reps?.toString() || '' }))
          }
        }
        if (Object.keys(loadedSets).length > 0) {
          setSets(prev => ({ ...prev, ...loadedSets }))
        }
      }
    } else {
      const { data: newSession } = await supabase
        .from('workout_sessions')
        .insert({ client_id: clientId, session_date: today })
        .select()
        .single()
      if (newSession) setSessionId(newSession.id)
    }

    setLoading(false)
  }

  function addSet(exerciseId: string) {
    setSets(prev => ({ ...prev, [exerciseId]: [...(prev[exerciseId] || []), { weight: '', reps: '' }] }))
  }

  function removeSet(exerciseId: string, i: number) {
    setSets(prev => ({ ...prev, [exerciseId]: prev[exerciseId].filter((_, idx) => idx !== i) }))
  }

  function updateSet(exerciseId: string, i: number, field: 'weight' | 'reps', value: string) {
    setSets(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, idx) => idx === i ? { ...s, [field]: value } : s)
    }))
  }

  async function saveExercise(ex: ExerciseWithHistory) {
    if (!sessionId) return
    const validSets = (sets[ex.id] || []).filter(s => s.weight || s.reps)
    if (validSets.length === 0) { toast.error('Enter at least one set'); return }

    setSaving(ex.id)

    // Replace existing sets for this exercise in today's session
    await supabase.from('set_logs').delete().eq('session_id', sessionId).eq('exercise_name', ex.name)

    const { error } = await supabase.from('set_logs').insert(
      validSets.map((s, i) => ({
        session_id: sessionId,
        client_id: clientId,
        exercise_name: ex.name,
        set_number: i + 1,
        weight_lbs: s.weight ? parseFloat(s.weight) : null,
        reps: s.reps ? parseInt(s.reps) : null,
      }))
    )

    setSaving(null)
    if (error) { toast.error('Failed to save'); return }
    toast.success(`${ex.name} saved!`)
  }

  if (templates.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
        Your coach hasn&apos;t set up your workouts yet. Check back soon!
      </div>
    )
  }

  if (!selectedTemplate) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-zinc-400" />
          <h3 className="font-medium text-white text-sm">Select Today&apos;s Workout</h3>
        </div>
        <div className="divide-y divide-zinc-800">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => selectWorkout(t)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-zinc-800 transition-colors text-left"
            >
              <span className="text-white font-medium">{t.name}</span>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
        Loading workout…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => { setSelectedTemplate(null); setExercises([]); setSets({}) }}
        className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to workouts
      </button>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
        <h3 className="font-semibold text-white">{selectedTemplate.name}</h3>
        <p className="text-zinc-500 text-xs mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {exercises.map(ex => {
        // Group last sets by session (get most recent session only)
        const lastSessionSets = ex.lastSets.slice(0, 6)

        return (
          <div key={ex.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h4 className="font-medium text-white">{ex.name}</h4>

            {(ex.target_sets || ex.target_reps) && (
              <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <p className="text-xs font-medium" style={{ color: '#C9A84C' }}>
                  Target: {ex.target_sets ? `${ex.target_sets} sets` : ''}{ex.target_sets && ex.target_reps ? ' × ' : ''}{ex.target_reps ? `${ex.target_reps} reps` : ''}
                  {ex.exercise_notes ? <span className="text-[#888] font-normal ml-2">— {ex.exercise_notes}</span> : null}
                </p>
              </div>
            )}

            {lastSessionSets.length > 0 && (
              <div className="bg-zinc-800 rounded-lg px-3 py-2">
                <p className="text-zinc-500 text-xs mb-1.5">Last session</p>
                <div className="flex flex-wrap gap-2">
                  {lastSessionSets.map(s => (
                    <span key={s.id} className="text-zinc-300 text-xs font-medium">
                      {s.weight_lbs ? `${s.weight_lbs}lb` : '—'} × {s.reps ?? '—'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="grid grid-cols-[40px_1fr_12px_1fr_28px] gap-2 items-center">
                <span className="text-zinc-600 text-xs">Set</span>
                <span className="text-zinc-600 text-xs">Weight (lbs)</span>
                <span />
                <span className="text-zinc-600 text-xs">Reps</span>
                <span />
              </div>
              {(sets[ex.id] || []).map((s, i) => (
                <div key={i} className="grid grid-cols-[40px_1fr_12px_1fr_28px] gap-2 items-center">
                  <span className="text-zinc-500 text-xs">{i + 1}</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={s.weight}
                    onChange={(e) => updateSet(ex.id, i, 'weight', e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm"
                  />
                  <span className="text-zinc-600 text-xs text-center">×</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={s.reps}
                    onChange={(e) => updateSet(ex.id, i, 'reps', e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm"
                  />
                  {(sets[ex.id] || []).length > 1 && (
                    <button onClick={() => removeSet(ex.id, i)} className="text-zinc-600 hover:text-red-400 transition-colors flex justify-center">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => addSet(ex.id)}
                className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add set
              </button>
              <Button
                size="sm"
                onClick={() => saveExercise(ex)}
                disabled={saving === ex.id}
                className="bg-white text-black hover:bg-zinc-200 h-7 px-3 text-xs"
              >
                {saving === ex.id ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
