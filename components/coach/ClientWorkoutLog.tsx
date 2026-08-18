'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, Dumbbell } from 'lucide-react'

interface Session {
  id: string
  session_date: string
  notes: string | null
}

interface SetLog {
  id: string
  session_id: string
  exercise_name: string
  set_number: number
  weight_lbs: number | null
  reps: number | null
}

interface Props {
  clientId: string
}

export default function ClientWorkoutLog({ clientId }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [sets, setSets] = useState<Record<string, SetLog[]>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', clientId)
        .order('session_date', { ascending: false })
        .limit(50)

      if (!sessionData || sessionData.length === 0) { setLoading(false); return }
      setSessions(sessionData)

      const sessionIds = sessionData.map(s => s.id)
      const { data: setData } = await supabase
        .from('set_logs')
        .select('*')
        .in('session_id', sessionIds)
        .order('exercise_name')
        .order('set_number')

      const grouped: Record<string, SetLog[]> = {}
      for (const s of (setData || [])) {
        if (!grouped[s.session_id]) grouped[s.session_id] = []
        grouped[s.session_id].push(s)
      }
      setSets(grouped)

      // Auto-expand the most recent session
      if (sessionData[0]) setExpanded({ [sessionData[0].id]: true })
      setLoading(false)
    }
    load()
  }, [clientId])

  function toggle(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) return <p className="text-[#555] text-sm">Loading workout history…</p>

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Dumbbell className="w-6 h-6 mx-auto mb-2 text-zinc-700" />
        <p className="text-zinc-500 text-sm">No workout sessions logged yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.map(session => {
        const sessionSets = sets[session.id] || []
        const isOpen = !!expanded[session.id]

        // Group sets by exercise
        const byExercise: Record<string, SetLog[]> = {}
        for (const s of sessionSets) {
          if (!byExercise[s.exercise_name]) byExercise[s.exercise_name] = []
          byExercise[s.exercise_name].push(s)
        }
        const exercises = Object.entries(byExercise)

        const totalSets = sessionSets.length
        const totalVolume = sessionSets.reduce((sum, s) => sum + ((s.weight_lbs ?? 0) * (s.reps ?? 0)), 0)

        return (
          <div key={session.id} className="rounded-2xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              onClick={() => toggle(session.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(201,168,76,0.1)' }}>
                  <Dumbbell className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">
                    {new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-[#555] text-xs">
                    {totalSets} set{totalSets !== 1 ? 's' : ''} · {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
                    {totalVolume > 0 && ` · ${Math.round(totalVolume).toLocaleString()} lbs volume`}
                  </p>
                </div>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-[#555]" /> : <ChevronDown className="w-4 h-4 text-[#555]" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {session.notes && (
                  <p className="text-[#666] text-xs pt-3 italic">"{session.notes}"</p>
                )}
                {exercises.length === 0 ? (
                  <p className="text-[#555] text-xs pt-2">No sets logged for this session.</p>
                ) : (
                  <div className="pt-2 space-y-3">
                    {exercises.map(([name, exSets]) => (
                      <div key={name}>
                        <p className="text-white text-xs font-semibold mb-1.5">{name}</p>
                        <div className="space-y-1">
                          {exSets.map(s => (
                            <div key={s.id} className="flex items-center gap-4 text-xs">
                              <span className="text-[#555] w-10">Set {s.set_number}</span>
                              {s.weight_lbs != null && (
                                <span className="text-[#C9A84C] font-medium">{s.weight_lbs} lbs</span>
                              )}
                              {s.reps != null && (
                                <span className="text-[#aaa]">{s.reps} reps</span>
                              )}
                              {s.weight_lbs != null && s.reps != null && (
                                <span className="text-[#555]">{Math.round(s.weight_lbs * s.reps)} lbs</span>
                              )}
                            </div>
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
      })}
    </div>
  )
}
