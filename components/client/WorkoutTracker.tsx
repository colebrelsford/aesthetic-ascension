'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkoutTemplate, WorkoutExercise } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ChevronRight, ArrowLeft, Plus, Trash2, Dumbbell, ChevronDown, ChevronUp, Check } from 'lucide-react'

interface Props {
  clientId: string
}

interface SessionHistory {
  date: string
  sets: { set_number: number; weight_lbs: number | null; reps: number | null }[]
}

interface ExerciseWithHistory extends WorkoutExercise {
  sessionHistory: SessionHistory[]
}

export default function WorkoutTracker({ clientId }: Props) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)
  const [exercises, setExercises] = useState<ExerciseWithHistory[]>([])
  const [sets, setSets] = useState<Record<string, { weight: string; reps: string }[]>>({})
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showTips, setShowTips] = useState(false)
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
    setSaved(false)

    const { data: exs } = await supabase
      .from('workout_exercises')
      .select('*')
      .eq('template_id', template.id)
      .order('display_order')

    if (!exs) { setLoading(false); return }

    // Get local date string (not UTC) so timezone doesn't shift the day
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // Load last 10 past sessions (not today) for this client
    const { data: pastSessions } = await supabase
      .from('workout_sessions')
      .select('id, session_date')
      .eq('client_id', clientId)
      .neq('session_date', today)
      .order('session_date', { ascending: false })
      .limit(10)

    let allRecentSets: { session_id: string; exercise_name: string; set_number: number; weight_lbs: number | null; reps: number | null }[] = []
    if (pastSessions && pastSessions.length > 0) {
      const { data: setData } = await supabase
        .from('set_logs')
        .select('session_id, exercise_name, set_number, weight_lbs, reps')
        .in('session_id', pastSessions.map(s => s.id))
      allRecentSets = setData || []
    }

    const sessionDateMap: Record<string, string> = {}
    for (const s of (pastSessions || [])) sessionDateMap[s.id] = s.session_date

    const exercisesWithHistory: ExerciseWithHistory[] = exs.map(ex => {
      const pastSets = allRecentSets.filter(s => s.exercise_name === ex.name)
      const byDate: Record<string, typeof pastSets> = {}
      for (const s of pastSets) {
        const date = sessionDateMap[s.session_id]
        if (!date) continue
        if (!byDate[date]) byDate[date] = []
        byDate[date].push(s)
      }
      const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).slice(0, 3)
      return {
        ...ex,
        sessionHistory: sortedDates.map(date => ({
          date,
          sets: byDate[date].sort((a, b) => a.set_number - b.set_number),
        })),
      }
    })

    setExercises(exercisesWithHistory)

    // Initialize empty sets for today
    const initSets: Record<string, { weight: string; reps: string }[]> = {}
    for (const ex of exs) {
      initSets[ex.id] = [{ weight: '', reps: '' }]
    }
    setSets(initSets)

    // Get or create today's session (today already computed above as local date)
    const { data: existing } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('client_id', clientId)
      .eq('session_date', today)
      .single()

    if (existing) {
      setSessionId(existing.id)
      // Load any sets already logged today
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
        if (Object.keys(loadedSets).length > 0) setSets(prev => ({ ...prev, ...loadedSets }))
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
      [exerciseId]: prev[exerciseId].map((s, idx) => idx === i ? { ...s, [field]: value } : s),
    }))
    setSaved(false)
  }

  async function saveAll() {
    if (!sessionId) return
    setSaving(true)

    for (const ex of exercises) {
      const validSets = (sets[ex.id] || []).filter(s => s.weight || s.reps)
      if (validSets.length === 0) continue

      await supabase.from('set_logs').delete().eq('session_id', sessionId).eq('exercise_name', ex.name)
      await supabase.from('set_logs').insert(
        validSets.map((s, i) => ({
          session_id: sessionId,
          client_id: clientId,
          exercise_name: ex.name,
          set_number: i + 1,
          weight_lbs: s.weight ? parseFloat(s.weight) : null,
          reps: s.reps ? parseInt(s.reps) : null,
        }))
      )
    }

    setSaving(false)
    setSaved(true)
    toast.success('Workout saved!')
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
      <div className="space-y-3">
        {/* Training Guidelines */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.18)' }}>
          <button onClick={() => setShowTips(!showTips)} className="w-full flex items-center justify-between px-4 py-3 text-left">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(201,168,76,0.12)' }}>
                <Dumbbell className="w-3 h-3" style={{ color: '#C9A84C' }} />
              </div>
              <span className="text-sm font-semibold text-white">Training Guidelines</span>
            </div>
            {showTips ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
          </button>
          {showTips && (
            <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="pt-3 space-y-3">
                {[
                  { heading: 'Warm-up sets', body: 'Do 1–3 warm-up sets as you approach your working weight. These do NOT count as working sets — use lighter weight to prime the movement and protect your joints.' },
                  { heading: 'Only count working sets', body: "Log only your true working sets. If a set was too easy to be challenging, it wasn't a working set." },
                  { heading: 'Train to failure', body: 'Every working set should be taken to technical failure — the point where you cannot complete another rep with good form. Set yourself up to fail within the designated rep range. If you hit the top of the range with gas left in the tank, add weight next session.' },
                  { heading: 'Rest between sets', body: 'Rest 1.5–2.5 minutes between working sets. Too little rest and you won\'t recover enough to perform the next set properly. Too much and you lose the metabolic stress that drives adaptation.' },
                  { heading: 'Control the eccentric', body: "Be slow and deliberate on the way down (eccentric). A 2–3 second negative puts more stress on the muscle and reduces injury risk. Don't let gravity do the work." },
                  { heading: 'Pause and contract', body: 'At the top of each rep, pause and squeeze the target muscle. Feel the contraction before returning to the start. This is what separates intentional training from just moving weight.' },
                  { heading: 'Lift with intention', body: "Every rep should be deliberate. Think about the muscle you're training — not the weight in your hands. Throwing weight around builds momentum, not muscle." },
                  { heading: 'Mind-muscle connection', body: "If you can't feel the target muscle working, reduce the weight and slow down. Quality of contraction matters more than load." },
                  { heading: 'Progressive overload', body: 'The goal each week is to beat your previous session — more weight, more reps, or better form. Small consistent improvements compound into real results. This is why you log your sets.' },
                ].map(({ heading, body }) => (
                  <div key={heading} className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-xs font-semibold mb-0.5" style={{ color: '#C9A84C' }}>{heading}</p>
                    <p className="text-zinc-400 text-xs leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-zinc-400" />
            <h3 className="font-medium text-white text-sm">Select Today&apos;s Workout</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {templates.map(t => (
              <button key={t.id} onClick={() => selectWorkout(t)} className="w-full flex items-center justify-between px-4 py-4 hover:bg-zinc-800 transition-colors text-left">
                <span className="text-white font-medium">{t.name}</span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>
            ))}
          </div>
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
    <div className="space-y-4 pb-28">
      <button onClick={() => { setSelectedTemplate(null); setExercises([]); setSets({}) }} className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to workouts
      </button>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
        <h3 className="font-semibold text-white">{selectedTemplate.name}</h3>
        <p className="text-zinc-500 text-xs mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Training Guidelines — collapsed during workout */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.18)' }}>
        <button onClick={() => setShowTips(!showTips)} className="w-full flex items-center justify-between px-4 py-3 text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(201,168,76,0.12)' }}>
              <Dumbbell className="w-3 h-3" style={{ color: '#C9A84C' }} />
            </div>
            <span className="text-sm font-semibold text-white">Training Guidelines</span>
          </div>
          {showTips ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </button>
        {showTips && (
          <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="pt-3 space-y-2">
              {[
                { heading: 'Warm-up sets', body: "1–3 warm-up sets as you approach your working weight. Do NOT count these as working sets." },
                { heading: 'Train to failure', body: "Every working set goes to technical failure — the point where you cannot complete another clean rep." },
                { heading: 'Rest between sets', body: "Rest 1.5–2.5 minutes between working sets." },
                { heading: 'Control the eccentric', body: "Slow and deliberate on the way down (2–3 seconds). Don't let gravity do the work." },
                { heading: 'Pause and contract', body: "At the top of each rep, pause and squeeze the target muscle before returning." },
                { heading: 'Progressive overload', body: "Beat your previous session — more weight, more reps, or better form. That's why you log." },
              ].map(({ heading, body }) => (
                <div key={heading} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: '#C9A84C' }}>{heading}</p>
                  <p className="text-zinc-400 text-xs leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {exercises.map(ex => (
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

          {/* Session history — organized by date */}
          {ex.sessionHistory.length > 0 && (
            <div className="rounded-lg px-3 py-2.5 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {ex.sessionHistory.map((session, si) => (
                <div key={session.date}>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">
                    {si === 0 ? 'Last session' : si === 1 ? 'Session before' : '2 sessions ago'} · {formatDate(session.date)}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {session.sets.map(s => (
                      <span key={s.set_number} className="text-zinc-300 text-xs font-medium">
                        {s.weight_lbs != null ? `${s.weight_lbs}lb` : '—'} × {s.reps ?? '—'}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-[36px_1fr_12px_1fr_28px] gap-2 items-center">
              <span className="text-zinc-600 text-xs">Set</span>
              <span className="text-zinc-600 text-xs">Weight (lbs)</span>
              <span />
              <span className="text-zinc-600 text-xs">Reps</span>
              <span />
            </div>
            {(sets[ex.id] || []).map((s, i) => (
              <div key={i} className="grid grid-cols-[36px_1fr_12px_1fr_28px] gap-2 items-center">
                <span className="text-zinc-500 text-xs font-medium">{i + 1}</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={s.weight}
                  onChange={e => updateSet(ex.id, i, 'weight', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white h-10 text-sm"
                />
                <span className="text-zinc-600 text-xs text-center">×</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={s.reps}
                  onChange={e => updateSet(ex.id, i, 'reps', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white h-10 text-sm"
                />
                {(sets[ex.id] || []).length > 1 && (
                  <button onClick={() => removeSet(ex.id, i)} className="text-zinc-600 hover:text-red-400 transition-colors flex justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button onClick={() => addSet(ex.id)} className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs transition-colors pt-1">
            <Plus className="w-3.5 h-3.5" /> Add set
          </button>
        </div>
      ))}

      {/* Sticky save button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-30" style={{ background: 'linear-gradient(to top, #000 60%, transparent)' }}>
        <button
          onClick={saveAll}
          disabled={saving}
          className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-black disabled:opacity-60 transition-all"
          style={{ background: saved ? 'linear-gradient(135deg, #4ade80, #22c55e)' : 'linear-gradient(135deg, #C9A84C, #E8C97A)', display: 'flex' }}
        >
          {saving ? 'Saving…' : saved ? (<><Check className="w-5 h-5" /> Workout Saved</>) : 'Save Workout'}
        </button>
      </div>
    </div>
  )
}
