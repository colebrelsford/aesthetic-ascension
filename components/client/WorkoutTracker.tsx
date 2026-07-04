'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plan, SetLog, WorkoutSession } from '@/lib/types'
import { parseExercisesFromHtml } from '@/lib/parseExercises'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ChevronRight, ChevronDown, Plus, Trash2, TrendingUp } from 'lucide-react'

interface Props {
  clientId: string
  plan: Plan | null
}

interface SessionWithSets extends WorkoutSession {
  sets: SetLog[]
}

export default function WorkoutTracker({ clientId, plan }: Props) {
  const [exercises, setExercises] = useState<string[]>([])
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [history, setHistory] = useState<SessionWithSets[]>([])
  const [todaySets, setTodaySets] = useState<{ weight: string; reps: string }[]>([{ weight: '', reps: '' }])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (plan?.training_split) {
      setExercises(parseExercisesFromHtml(plan.training_split))
    }
  }, [plan])

  useEffect(() => {
    if (!selectedExercise) return
    loadHistory(selectedExercise)
  }, [selectedExercise])

  async function loadHistory(exercise: string) {
    const { data } = await supabase
      .from('set_logs')
      .select('*, workout_sessions(session_date)')
      .eq('client_id', clientId)
      .eq('exercise_name', exercise)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!data) return

    // Group by session
    const sessionMap = new Map<string, SessionWithSets>()
    for (const row of data) {
      const session = row.workout_sessions as { session_date: string }
      const sid = row.session_id
      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, {
          id: sid,
          client_id: clientId,
          session_date: session.session_date,
          notes: null,
          created_at: row.created_at,
          sets: [],
        })
      }
      sessionMap.get(sid)!.sets.push(row)
    }

    const sorted = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
    )
    setHistory(sorted)
    setTodaySets([{ weight: '', reps: '' }])
  }

  function addSet() {
    setTodaySets(prev => [...prev, { weight: '', reps: '' }])
  }

  function removeSet(i: number) {
    setTodaySets(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateSet(i: number, field: 'weight' | 'reps', value: string) {
    setTodaySets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  async function handleSave() {
    if (!selectedExercise) return
    const validSets = todaySets.filter(s => s.weight || s.reps)
    if (validSets.length === 0) {
      toast.error('Enter at least one set')
      return
    }

    setSaving(true)
    const today = new Date().toISOString().split('T')[0]

    // Get or create today's session
    let sessionId: string
    const { data: existing } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('client_id', clientId)
      .eq('session_date', today)
      .single()

    if (existing) {
      sessionId = existing.id
      // Delete existing sets for this exercise today so we can replace
      await supabase
        .from('set_logs')
        .delete()
        .eq('session_id', sessionId)
        .eq('exercise_name', selectedExercise)
    } else {
      const { data: newSession, error } = await supabase
        .from('workout_sessions')
        .insert({ client_id: clientId, session_date: today })
        .select()
        .single()
      if (error || !newSession) {
        toast.error('Failed to save')
        setSaving(false)
        return
      }
      sessionId = newSession.id
    }

    const setsToInsert = validSets.map((s, i) => ({
      session_id: sessionId,
      client_id: clientId,
      exercise_name: selectedExercise,
      set_number: i + 1,
      weight_lbs: s.weight ? parseFloat(s.weight) : null,
      reps: s.reps ? parseInt(s.reps) : null,
    }))

    const { error } = await supabase.from('set_logs').insert(setsToInsert)
    setSaving(false)

    if (error) {
      toast.error('Failed to save sets')
      return
    }

    toast.success('Sets saved!')
    loadHistory(selectedExercise)
  }

  const lastSession = history[0]

  if (exercises.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
        No exercises found. Make sure your training split is saved in your plan.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!selectedExercise ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zinc-400" />
            <h3 className="font-medium text-white text-sm">Select an Exercise</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {exercises.map(ex => (
              <button
                key={ex}
                onClick={() => setSelectedExercise(ex)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800 transition-colors text-left"
              >
                <span className="text-zinc-200 text-sm">{ex}</span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedExercise(null)}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors"
          >
            <ChevronDown className="w-4 h-4 rotate-90" />
            Back to exercises
          </button>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-white">{selectedExercise}</h3>

            {/* Last session reference */}
            {lastSession && (
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-zinc-400 text-xs mb-2">
                  Last session — {new Date(lastSession.session_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {lastSession.sets.sort((a, b) => a.set_number - b.set_number).map(s => (
                    <span key={s.id} className="text-white text-sm font-medium bg-zinc-700 px-2 py-0.5 rounded">
                      {s.weight_lbs ? `${s.weight_lbs}lb` : '—'} × {s.reps ?? '—'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Log today's sets */}
            <div className="space-y-2">
              <p className="text-zinc-400 text-xs">Log today&apos;s sets</p>
              <div className="space-y-2">
                {todaySets.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-zinc-500 text-xs w-10">Set {i + 1}</span>
                    <Input
                      type="number"
                      placeholder="lbs"
                      value={s.weight}
                      onChange={(e) => updateSet(i, 'weight', e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white w-20 h-8 text-sm"
                    />
                    <span className="text-zinc-600 text-xs">×</span>
                    <Input
                      type="number"
                      placeholder="reps"
                      value={s.reps}
                      onChange={(e) => updateSet(i, 'reps', e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white w-20 h-8 text-sm"
                    />
                    {todaySets.length > 1 && (
                      <button onClick={() => removeSet(i)} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addSet}
                className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs transition-colors mt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add set
              </button>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-white text-black hover:bg-zinc-200 font-medium"
            >
              {saving ? 'Saving…' : 'Save Sets'}
            </Button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <h4 className="text-sm font-medium text-white">History</h4>
              </div>
              <div className="divide-y divide-zinc-800">
                {history.map(session => (
                  <div key={session.id} className="px-4 py-3">
                    <p className="text-zinc-400 text-xs mb-1.5">
                      {new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {session.sets.sort((a, b) => a.set_number - b.set_number).map(s => (
                        <span key={s.id} className="text-white text-sm font-medium">
                          {s.weight_lbs ? `${s.weight_lbs}lb` : '—'} × {s.reps ?? '—'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
