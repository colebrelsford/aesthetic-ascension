'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, Dumbbell, TrendingUp, TrendingDown, Minus } from 'lucide-react'

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

interface TopSet {
  weight_lbs: number | null
  reps: number | null
  volume: number
}

interface Props {
  clientId: string
}

// Top set = highest weight; tie-break by reps
function getTopSet(sets: SetLog[]): TopSet | null {
  if (!sets.length) return null
  const withWeight = sets.filter(s => s.weight_lbs != null)
  if (!withWeight.length) return null
  const top = withWeight.reduce((best, s) => {
    if ((s.weight_lbs ?? 0) > (best.weight_lbs ?? 0)) return s
    if ((s.weight_lbs ?? 0) === (best.weight_lbs ?? 0) && (s.reps ?? 0) > (best.reps ?? 0)) return s
    return best
  })
  return { weight_lbs: top.weight_lbs, reps: top.reps, volume: (top.weight_lbs ?? 0) * (top.reps ?? 0) }
}

function groupByExercise(sets: SetLog[]): Record<string, SetLog[]> {
  const out: Record<string, SetLog[]> = {}
  for (const s of sets) {
    if (!out[s.exercise_name]) out[s.exercise_name] = []
    out[s.exercise_name].push(s)
  }
  return out
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

      const { data: setData } = await supabase
        .from('set_logs')
        .select('*')
        .in('session_id', sessionData.map(s => s.id))
        .order('exercise_name')
        .order('set_number')

      const grouped: Record<string, SetLog[]> = {}
      for (const s of (setData || [])) {
        if (!grouped[s.session_id]) grouped[s.session_id] = []
        grouped[s.session_id].push(s)
      }
      setSets(grouped)
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

  // Build a lookup: exercise name → array of top sets across all sessions (newest first)
  // Used to find "previous best" for comparison
  const topSetHistory: Record<string, { sessionId: string; top: TopSet }[]> = {}
  for (const session of [...sessions].reverse()) { // oldest first so newest overwrites
    const byEx = groupByExercise(sets[session.id] || [])
    for (const [name, exSets] of Object.entries(byEx)) {
      const top = getTopSet(exSets)
      if (!top) continue
      if (!topSetHistory[name]) topSetHistory[name] = []
      topSetHistory[name].push({ sessionId: session.id, top })
    }
  }

  return (
    <div className="space-y-3">
      {sessions.map((session, sessionIndex) => {
        const sessionSets = sets[session.id] || []
        const isOpen = !!expanded[session.id]
        const byExercise = groupByExercise(sessionSets)
        const exercises = Object.entries(byExercise)
        const totalSets = sessionSets.length
        const totalVolume = sessionSets.reduce((sum, s) => sum + ((s.weight_lbs ?? 0) * (s.reps ?? 0)), 0)
        const isLatest = sessionIndex === 0
        const isPrev = sessionIndex === 1

        return (
          <div
            key={session.id}
            className="rounded-2xl overflow-hidden"
            style={{
              background: '#111',
              border: isLatest
                ? '1px solid rgba(201,168,76,0.3)'
                : '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <button
              onClick={() => toggle(session.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: isLatest ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)' }}>
                  <Dumbbell className="w-3.5 h-3.5" style={{ color: isLatest ? '#C9A84C' : '#555' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-semibold">
                      {new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    {isLatest && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>Latest</span>
                    )}
                    {isPrev && (
                      <span className="text-[10px] text-[#555] px-1.5 py-0.5 rounded-full border border-zinc-800">Previous</span>
                    )}
                  </div>
                  <p className="text-[#555] text-xs">
                    {totalSets} set{totalSets !== 1 ? 's' : ''} · {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
                    {totalVolume > 0 && ` · ${Math.round(totalVolume).toLocaleString()} lbs total volume`}
                  </p>
                </div>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-[#555]" /> : <ChevronDown className="w-4 h-4 text-[#555]" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {session.notes && (
                  <p className="text-[#666] text-xs pt-3 italic">"{session.notes}"</p>
                )}
                {exercises.length === 0 ? (
                  <p className="text-[#555] text-xs pt-2">No sets logged.</p>
                ) : (
                  <div className="pt-2 space-y-3">
                    {exercises.map(([name, exSets]) => {
                      const top = getTopSet(exSets)

                      // Find previous top set for this exercise (the entry before this session)
                      const history = topSetHistory[name] || []
                      const thisIdx = history.findIndex(h => h.sessionId === session.id)
                      const prevEntry = thisIdx > 0 ? history[thisIdx - 1] : null
                      const prevTop = prevEntry?.top ?? null

                      // Comparison delta
                      let weightDiff: number | null = null
                      let repsDiff: number | null = null
                      if (top && prevTop && top.weight_lbs != null && prevTop.weight_lbs != null) {
                        weightDiff = top.weight_lbs - prevTop.weight_lbs
                      }
                      if (top && prevTop && top.reps != null && prevTop.reps != null && weightDiff === 0) {
                        repsDiff = top.reps - prevTop.reps
                      }

                      const improved = (weightDiff != null && weightDiff > 0) || (repsDiff != null && repsDiff > 0)
                      const declined = (weightDiff != null && weightDiff < 0) || (repsDiff != null && repsDiff < 0)

                      return (
                        <div key={name} className="rounded-xl px-3 py-2.5" style={{
                          background: improved ? 'rgba(74,222,128,0.04)' : declined ? 'rgba(248,113,113,0.04)' : 'rgba(255,255,255,0.02)',
                          border: improved ? '1px solid rgba(74,222,128,0.15)' : declined ? '1px solid rgba(248,113,113,0.12)' : '1px solid rgba(255,255,255,0.05)',
                        }}>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-white text-xs font-semibold">{name}</p>
                            {/* Progression indicator */}
                            {top && prevTop && (
                              <div className="flex items-center gap-1 text-xs">
                                {improved && <TrendingUp className="w-3 h-3 text-green-400" />}
                                {declined && <TrendingDown className="w-3 h-3 text-red-400" />}
                                {!improved && !declined && <Minus className="w-3 h-3 text-[#555]" />}
                                <span style={{ color: improved ? '#4ade80' : declined ? '#f87171' : '#555' }}>
                                  {weightDiff != null && weightDiff !== 0
                                    ? `${weightDiff > 0 ? '+' : ''}${weightDiff} lbs`
                                    : repsDiff != null && repsDiff !== 0
                                    ? `${repsDiff > 0 ? '+' : ''}${repsDiff} reps`
                                    : 'same'}
                                </span>
                                {prevTop.weight_lbs != null && (
                                  <span className="text-[#444]">vs {prevTop.weight_lbs} lbs</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            {exSets.map(s => {
                              const isTopSet = top && s.weight_lbs === top.weight_lbs && s.reps === top.reps && s.set_number === exSets.find(x => x.weight_lbs === top.weight_lbs && x.reps === top.reps)?.set_number
                              return (
                                <div key={s.id} className="flex items-center gap-3 text-xs">
                                  <span className="text-[#444] w-9 shrink-0">Set {s.set_number}</span>
                                  {s.weight_lbs != null && (
                                    <span className={isTopSet ? 'font-bold' : 'font-medium'} style={{ color: isTopSet ? '#C9A84C' : '#888' }}>
                                      {s.weight_lbs} lbs
                                    </span>
                                  )}
                                  {s.reps != null && (
                                    <span className={isTopSet ? 'text-white font-semibold' : 'text-[#666]'}>
                                      {s.reps} reps
                                    </span>
                                  )}
                                  {isTopSet && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
                                      TOP
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
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
