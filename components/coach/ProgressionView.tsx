'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plan, SetLog, WorkoutSession } from '@/lib/types'
import { parseExercisesFromHtml } from '@/lib/parseExercises'
import { ChevronRight, TrendingUp } from 'lucide-react'

interface Props {
  clientId: string
  plan: Plan | null
}

interface SessionWithSets extends WorkoutSession {
  sets: SetLog[]
}

export default function ProgressionView({ clientId, plan }: Props) {
  const [exercises, setExercises] = useState<string[]>([])
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [history, setHistory] = useState<SessionWithSets[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (plan?.training_split) {
      setExercises(parseExercisesFromHtml(plan.training_split))
    }
  }, [plan])

  useEffect(() => {
    if (!selectedExercise) return

    supabase
      .from('set_logs')
      .select('*, workout_sessions(session_date)')
      .eq('client_id', clientId)
      .eq('exercise_name', selectedExercise)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!data) return
        const sessionMap = new Map<string, SessionWithSets>()
        for (const row of data) {
          const session = row.workout_sessions as { session_date: string }
          if (!sessionMap.has(row.session_id)) {
            sessionMap.set(row.session_id, {
              id: row.session_id,
              client_id: clientId,
              session_date: session.session_date,
              notes: null,
              created_at: row.created_at,
              sets: [],
            })
          }
          sessionMap.get(row.session_id)!.sets.push(row)
        }
        setHistory(
          Array.from(sessionMap.values()).sort(
            (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
          )
        )
      })
  }, [selectedExercise, clientId])

  if (exercises.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
        No exercises found in this client&apos;s training plan.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-zinc-400" />
          <h3 className="font-medium text-white text-sm">Exercise Progression</h3>
        </div>
        <div className="divide-y divide-zinc-800">
          {exercises.map(ex => (
            <button
              key={ex}
              onClick={() => setSelectedExercise(selectedExercise === ex ? null : ex)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800 transition-colors text-left"
            >
              <span className="text-zinc-200 text-sm">{ex}</span>
              <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${selectedExercise === ex ? 'rotate-90' : ''}`} />
            </button>
          ))}
        </div>
      </div>

      {selectedExercise && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h4 className="font-medium text-white text-sm">{selectedExercise} — History</h4>
          </div>
          {history.length === 0 ? (
            <div className="p-6 text-zinc-500 text-sm text-center">No sets logged yet.</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {history.map(session => (
                <div key={session.id} className="px-4 py-3">
                  <p className="text-zinc-400 text-xs mb-1.5">
                    {new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {session.sets.sort((a, b) => a.set_number - b.set_number).map(s => (
                      <span key={s.id} className="text-white text-sm font-medium bg-zinc-800 px-2 py-0.5 rounded">
                        {s.weight_lbs ? `${s.weight_lbs}lb` : '—'} × {s.reps ?? '—'}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
