'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, WeeklyCheckin, WeightLog, Plan } from '@/lib/types'
import { FileText, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus, RefreshCw } from 'lucide-react'

interface Props {
  client: Profile
}

interface BriefData {
  todayWeight: WeightLog | null
  sevenDaysAgoWeight: WeightLog | null
  recentLogs: WeightLog[]
  latestCheckin: WeeklyCheckin | null
  priorCheckin: WeeklyCheckin | null
  workoutSessionsThisWeek: number
  totalSetsThisWeek: number
  plan: Plan | null
}

function ratingLabel(val: number | null) {
  if (val === null) return '—'
  if (val >= 8) return `${val}/10`
  if (val >= 6) return `${val}/10`
  return `${val}/10`
}

function ratingColor(val: number | null, invert = false) {
  if (val === null) return '#555'
  if (invert) {
    if (val >= 7) return '#f87171'
    if (val >= 5) return '#fb923c'
    return '#4ade80'
  }
  if (val >= 8) return '#4ade80'
  if (val >= 6) return '#aaa'
  return '#f87171'
}

function weekOverWeek(curr: number | null, prev: number | null): string {
  if (curr === null || prev === null) return ''
  const diff = curr - prev
  if (Math.abs(diff) < 0.5) return ''
  return diff > 0 ? `↑${diff > 0 ? '+' : ''}${diff.toFixed(0)}` : `↓${diff.toFixed(0)}`
}

export default function WeeklyBrief({ client }: Props) {
  const [data, setData] = useState<BriefData | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function load(reset = false) {
    if (data && !reset) { setOpen(!open); return }
    setLoading(true)
    setOpen(true)
    setData(null)

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]
    const sixtyDaysAgoStr = new Date(today.getTime() - 60 * 86400000).toISOString().split('T')[0]

    const [
      { data: recentLogs },
      { data: checkins },
      { data: sessions },
      { data: sets },
      { data: planData },
    ] = await Promise.all([
      supabase.from('weight_logs').select('*').eq('client_id', client.id).gte('date', sixtyDaysAgoStr).lte('date', todayStr).order('date', { ascending: false }),
      supabase.from('weekly_checkins').select('*').eq('client_id', client.id).order('week_start', { ascending: false }).limit(2),
      supabase.from('workout_sessions').select('id').eq('client_id', client.id).gte('session_date', sevenDaysAgoStr),
      supabase.from('set_logs').select('id').eq('client_id', client.id).gte('created_at', sevenDaysAgoStr + 'T00:00:00'),
      supabase.from('plans').select('*').eq('client_id', client.id).single(),
    ])

    const logs = recentLogs || []
    const todayWeight = logs[0] || null
    const sevenDaysAgoWeight = logs.find(l => l.date <= sevenDaysAgoStr) || null

    setData({
      todayWeight,
      sevenDaysAgoWeight,
      recentLogs: logs,
      latestCheckin: checkins?.[0] || null,
      priorCheckin: checkins?.[1] || null,
      workoutSessionsThisWeek: sessions?.length || 0,
      totalSetsThisWeek: sets?.length || 0,
      plan: planData || null,
    })
    setLoading(false)
  }

  if (!data && !loading) {
    return (
      <button
        onClick={() => load()}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all w-full"
        style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}
      >
        <FileText className="w-4 h-4" />
        Generate weekly brief
      </button>
    )
  }

  if (loading) {
    return (
      <div className="rounded-xl px-4 py-3 text-sm text-[#555]" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.12)' }}>
        Loading brief…
      </div>
    )
  }

  if (!data) return null

  const weightDiff = data.todayWeight && data.sevenDaysAgoWeight
    ? data.todayWeight.weight_lbs - data.sevenDaysAgoWeight.weight_lbs
    : null
  const latestWeight = data.todayWeight
  const c = data.latestCheckin
  const prev = data.priorCheckin
  const plan = data.plan
  const stepsTarget = plan?.target_daily_steps ?? null

  // ── Comprehensive insights ──────────────────────────────────────────────────
  const flags: { text: string; type: 'good' | 'warn' | 'neutral' }[] = []

  if (!c) {
    flags.push({ text: 'No check-in submitted this week.', type: 'warn' })
  } else {
    // Weight context
    if (weightDiff !== null) {
      const phase = client.current_phase || ''
      const isCutPhase = /cut|fat loss|mini cut/i.test(phase)
      const isBulkPhase = /bulk|growth/i.test(phase)
      if (Math.abs(weightDiff) < 0.3) {
        flags.push({ text: 'Weight is stable this week.', type: isCutPhase ? 'warn' : 'neutral' })
      } else if (weightDiff < 0) {
        if (isBulkPhase && weightDiff < -1) flags.push({ text: `Down ${Math.abs(weightDiff).toFixed(1)} lbs — may be losing too fast for a bulk phase.`, type: 'warn' })
        else flags.push({ text: `Down ${Math.abs(weightDiff).toFixed(1)} lbs this week — on track.`, type: 'good' })
      } else {
        if (isCutPhase) flags.push({ text: `Up ${weightDiff.toFixed(1)} lbs — review adherence if this is a cut.`, type: 'warn' })
        else flags.push({ text: `Up ${weightDiff.toFixed(1)} lbs vs. last week.`, type: isBulkPhase ? 'good' : 'neutral' })
      }
    } else if (!data.todayWeight) {
      flags.push({ text: 'No weight logged recently — remind them to weigh in daily.', type: 'warn' })
    }

    // Steps vs target
    if (stepsTarget && c.avg_daily_steps != null) {
      flags.push({ text: `Reported ${c.avg_daily_steps.toLocaleString()} steps/day (target: ${stepsTarget}).`, type: 'neutral' })
    } else if (stepsTarget && c.avg_daily_steps == null) {
      flags.push({ text: `Steps not reported this week (target: ${stepsTarget}).`, type: 'warn' })
    } else if (!stepsTarget && c.avg_daily_steps != null) {
      flags.push({ text: `${c.avg_daily_steps.toLocaleString()} steps/day reported.`, type: 'neutral' })
    }

    // Sleep
    if (c.sleep_hours != null) {
      if (c.sleep_hours < 6) flags.push({ text: `Sleep is very low at ${c.sleep_hours}h/night — recovery and fat loss will suffer.`, type: 'warn' })
      else if (c.sleep_hours < 7) flags.push({ text: `Sleep is below ideal at ${c.sleep_hours}h/night — aim for 7–9h.`, type: 'warn' })
      else if (c.sleep_hours >= 7 && c.sleep_hours <= 9) flags.push({ text: `Sleep is solid at ${c.sleep_hours}h/night.`, type: 'good' })
    }
    if (c.sleep_quality != null && c.sleep_quality <= 4) {
      flags.push({ text: `Sleep quality is low (${c.sleep_quality}/10) even if hours are there — may need to address sleep hygiene.`, type: 'warn' })
    }

    // Water (stored as oz, display as gallons)
    if (c.water_intake_oz != null) {
      const gal = +(c.water_intake_oz / 128).toFixed(2)
      if (c.water_intake_oz < 64) flags.push({ text: `Water intake is low at ${gal} gal/day — target at least 0.5–0.75 gal.`, type: 'warn' })
      else if (c.water_intake_oz >= 100) flags.push({ text: `Water intake is excellent: ${gal} gal/day.`, type: 'good' })
    }

    // Meals missed
    if (c.meals_missed != null && c.meals_missed > 0) {
      if (c.meals_missed >= 3) flags.push({ text: `${c.meals_missed} meals missed this week — likely in a large deficit and may be sabotaging muscle retention.`, type: 'warn' })
      else flags.push({ text: `${c.meals_missed} meal${c.meals_missed > 1 ? 's' : ''} missed this week — worth discussing consistency.`, type: 'warn' })
    }

    // Off-plan meals
    if (c.off_plan_meals != null && c.off_plan_meals > 0) {
      if (c.off_plan_meals >= 4) flags.push({ text: `${c.off_plan_meals} off-plan meals — nutrition adherence was poor this week.`, type: 'warn' })
      else flags.push({ text: `${c.off_plan_meals} off-plan meal${c.off_plan_meals > 1 ? 's' : ''} — manageable but worth noting.`, type: 'neutral' })
    }

    // Nutrition adherence rating
    if (c.adherence_nutrition != null) {
      if (c.adherence_nutrition >= 8) flags.push({ text: `Nutrition adherence strong this week (${c.adherence_nutrition}/10).`, type: 'good' })
      else if (c.adherence_nutrition <= 4) flags.push({ text: `Nutrition adherence was low (${c.adherence_nutrition}/10) — revisit the plan.`, type: 'warn' })
    }

    // Energy
    if (c.energy_level != null) {
      if (c.energy_level <= 3) flags.push({ text: `Very low energy (${c.energy_level}/10) — check sleep, deficit depth, and stress.`, type: 'warn' })
      else if (c.energy_level <= 5) flags.push({ text: `Energy is below average (${c.energy_level}/10) — may need a diet break or deload.`, type: 'warn' })
    }

    // Stress
    if (c.stress_level != null && c.stress_level >= 8) {
      flags.push({ text: `Very high stress reported (${c.stress_level}/10) — consider reducing training volume temporarily.`, type: 'warn' })
    } else if (c.stress_level != null && c.stress_level >= 6) {
      flags.push({ text: `Moderate stress this week (${c.stress_level}/10) — keep an eye on recovery.`, type: 'neutral' })
    }

    // Training adherence
    if (c.adherence_training != null && c.adherence_training >= 8) {
      flags.push({ text: `Training consistency is great (${c.adherence_training}/10).`, type: 'good' })
    }

    // Workouts
    if (data.workoutSessionsThisWeek === 0) {
      flags.push({ text: 'No workout sessions logged in-app this week.', type: 'warn' })
    } else {
      flags.push({ text: `${data.workoutSessionsThisWeek} session${data.workoutSessionsThisWeek > 1 ? 's' : ''} logged this week (${data.totalSetsThisWeek} total sets).`, type: 'good' })
    }

    // Digestion
    if (c.digestion_notes && c.digestion_notes.trim()) {
      flags.push({ text: `Digestion note: "${c.digestion_notes}"`, type: 'neutral' })
    }

    // Week-over-week energy trend
    if (prev && c.energy_level !== null && prev.energy_level !== null) {
      const diff = c.energy_level - prev.energy_level
      if (diff >= 3) flags.push({ text: `Energy improved significantly vs. last week (+${diff} points).`, type: 'good' })
      else if (diff <= -3) flags.push({ text: `Energy dropped vs. last week (${diff} points) — investigate.`, type: 'warn' })
    }

    // Week-over-week stress trend
    if (prev && c.stress_level !== null && prev.stress_level !== null) {
      const diff = c.stress_level - prev.stress_level
      if (diff >= 3) flags.push({ text: `Stress increased significantly vs. last week (+${diff} points).`, type: 'warn' })
    }

    // Goal weight
    if (client.goal_weight_lbs && latestWeight) {
      const toGoal = latestWeight.weight_lbs - client.goal_weight_lbs
      if (toGoal <= 0) flags.push({ text: `Goal weight of ${client.goal_weight_lbs} lbs reached!`, type: 'good' })
      else flags.push({ text: `${toGoal.toFixed(1)} lbs remaining to goal weight of ${client.goal_weight_lbs} lbs.`, type: 'neutral' })
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: '#C9A84C' }} />
          <span className="text-sm font-semibold text-white">Weekly Brief</span>
          {c && (
            <span className="text-xs text-[#555]">
              {new Date(c.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            title="Regenerate brief"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all text-[#666] hover:text-[#C9A84C]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-[#555]" /> : <ChevronDown className="w-4 h-4 text-[#555]" />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-5 space-y-5" style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>

          {/* Phase */}
          {client.current_phase && (
            <div className="pt-4">
              <p className="text-[#555] text-xs uppercase tracking-wider mb-1.5">Current Phase</p>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                {client.current_phase}
                {client.phase_start_date && (() => {
                  const weeks = Math.floor((Date.now() - new Date(client.phase_start_date).getTime()) / (7 * 86400000))
                  return weeks >= 0 ? ` — Week ${weeks + 1}` : ''
                })()}
              </span>
            </div>
          )}

          {/* Weight */}
          <div className={client.current_phase ? '' : 'pt-4'}>
            <p className="text-[#555] text-xs uppercase tracking-wider mb-2">Weight</p>
            <div className="flex items-center gap-4 flex-wrap">
              {latestWeight ? (
                <div>
                  <span className="text-white font-bold text-lg">{latestWeight.weight_lbs} lbs</span>
                  <span className="text-[#555] text-xs ml-2">({latestWeight.date})</span>
                </div>
              ) : (
                <span className="text-[#555] text-sm">No weight logged</span>
              )}
              {data.sevenDaysAgoWeight && (
                <span className="text-[#666] text-xs">7 days ago: {data.sevenDaysAgoWeight.weight_lbs} lbs</span>
              )}
              {weightDiff !== null && (
                <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: weightDiff < 0 ? '#4ade80' : weightDiff > 0 ? '#f87171' : '#888' }}>
                  {weightDiff < 0 ? <TrendingDown className="w-4 h-4" /> : weightDiff > 0 ? <TrendingUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} lbs
                </span>
              )}
            </div>
            {client.goal_weight_lbs && latestWeight && (
              <p className="text-[#555] text-xs mt-1.5">
                Goal: {client.goal_weight_lbs} lbs · {Math.max(0, latestWeight.weight_lbs - client.goal_weight_lbs).toFixed(1)} lbs to go
              </p>
            )}
          </div>

          {/* Check-in ratings */}
          {c && (
            <div>
              <p className="text-[#555] text-xs uppercase tracking-wider mb-2">Subjective Ratings</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                {[
                  { label: 'Energy', val: c.energy_level, prevVal: prev?.energy_level ?? null, invert: false },
                  { label: 'Sleep quality', val: c.sleep_quality, prevVal: prev?.sleep_quality ?? null, invert: false },
                  { label: 'Stress', val: c.stress_level, prevVal: prev?.stress_level ?? null, invert: true },
                  { label: 'Nutrition adherence', val: c.adherence_nutrition, prevVal: prev?.adherence_nutrition ?? null, invert: false },
                  { label: 'Training adherence', val: c.adherence_training, prevVal: prev?.adherence_training ?? null, invert: false },
                ].map(({ label, val, prevVal, invert }) => {
                  const wow = weekOverWeek(val, prevVal)
                  return (
                    <div key={label} className="flex justify-between items-center text-xs">
                      <span className="text-[#666]">{label}</span>
                      <div className="flex items-center gap-2">
                        {wow && (
                          <span className="text-[#555]">{wow}</span>
                        )}
                        <span className="font-semibold w-12 text-right" style={{ color: ratingColor(val, invert) }}>
                          {ratingLabel(val)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Weekly numbers */}
          {c && (c.avg_daily_steps != null || c.sleep_hours != null || c.water_intake_oz != null || (c.meals_missed ?? 0) > 0 || (c.off_plan_meals ?? 0) > 0) && (
            <div>
              <p className="text-[#555] text-xs uppercase tracking-wider mb-2">Weekly Numbers</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                {c.sleep_hours != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#666]">Sleep avg</span>
                    <span className="font-semibold" style={{ color: c.sleep_hours >= 7 ? '#4ade80' : c.sleep_hours >= 6 ? '#fb923c' : '#f87171' }}>
                      {c.sleep_hours}h / night
                    </span>
                  </div>
                )}
                {c.avg_daily_steps != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#666]">Steps / day</span>
                    <span className="font-semibold text-[#aaa]">
                      {c.avg_daily_steps.toLocaleString()}{stepsTarget ? ` (target: ${stepsTarget})` : ''}
                    </span>
                  </div>
                )}
                {c.water_intake_oz != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#666]">Water / day</span>
                    <span className="font-semibold" style={{ color: c.water_intake_oz >= 80 ? '#4ade80' : c.water_intake_oz >= 64 ? '#aaa' : '#f87171' }}>
                      {(c.water_intake_oz / 128).toFixed(2)} gal
                    </span>
                  </div>
                )}
                {c.meals_missed != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#666]">Meals missed</span>
                    <span className="font-semibold" style={{ color: c.meals_missed === 0 ? '#4ade80' : c.meals_missed <= 2 ? '#fb923c' : '#f87171' }}>
                      {c.meals_missed}
                    </span>
                  </div>
                )}
                {c.off_plan_meals != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#666]">Off-plan meals</span>
                    <span className="font-semibold" style={{ color: c.off_plan_meals === 0 ? '#4ade80' : c.off_plan_meals <= 2 ? '#fb923c' : '#f87171' }}>
                      {c.off_plan_meals}
                    </span>
                  </div>
                )}
              </div>
              {c.digestion_notes && (
                <p className="text-[#666] text-xs mt-2">Digestion: {c.digestion_notes}</p>
              )}
            </div>
          )}

          {/* Workouts */}
          <div>
            <p className="text-[#555] text-xs uppercase tracking-wider mb-1.5">Training This Week</p>
            <p className="text-white text-sm font-semibold">
              {data.workoutSessionsThisWeek} session{data.workoutSessionsThisWeek !== 1 ? 's' : ''}
              <span className="text-[#666] font-normal text-xs ml-2">{data.totalSetsThisWeek} total sets logged</span>
            </p>
          </div>

          {/* Wins & Struggles */}
          {c && (c.three_wins || c.three_struggles) && (
            <div>
              <p className="text-[#555] text-xs uppercase tracking-wider mb-2">Client Notes</p>
              {c.three_wins && (
                <div className="mb-2">
                  <p className="text-[#4ade80] text-xs font-semibold mb-0.5">Wins</p>
                  <p className="text-[#aaa] text-xs">{c.three_wins}</p>
                </div>
              )}
              {c.three_struggles && (
                <div className="mb-2">
                  <p className="text-[#f87171] text-xs font-semibold mb-0.5">Struggles</p>
                  <p className="text-[#aaa] text-xs">{c.three_struggles}</p>
                </div>
              )}
              {c.could_do_better && (
                <div className="mb-2">
                  <p className="text-[#C9A84C] text-xs font-semibold mb-0.5">Could do better</p>
                  <p className="text-[#aaa] text-xs">{c.could_do_better}</p>
                </div>
              )}
              {c.anything_else && (
                <div>
                  <p className="text-[#888] text-xs font-semibold mb-0.5">Anything else</p>
                  <p className="text-[#aaa] text-xs italic">"{c.anything_else}"</p>
                </div>
              )}
            </div>
          )}

          {/* Coach action items */}
          {flags.length > 0 && (
            <div>
              <p className="text-[#555] text-xs uppercase tracking-wider mb-2">Coach Insights</p>
              <div className="space-y-2">
                {flags.map((ins, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 shrink-0 text-base leading-none" style={{ color: ins.type === 'good' ? '#4ade80' : ins.type === 'warn' ? '#f87171' : '#888' }}>
                      {ins.type === 'good' ? '↑' : ins.type === 'warn' ? '!' : '·'}
                    </span>
                    <span style={{ color: ins.type === 'warn' ? '#fca5a5' : ins.type === 'good' ? '#bbf7d0' : '#bbb' }}>{ins.text}</span>
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
