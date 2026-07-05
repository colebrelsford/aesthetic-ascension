'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, WeeklyCheckin, WeightLog } from '@/lib/types'
import { FileText, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus, RefreshCw } from 'lucide-react'

interface Props {
  client: Profile
}

interface BriefData {
  weightThisWeek: WeightLog[]
  weightLastWeek: WeightLog[]
  latestCheckin: WeeklyCheckin | null
  priorCheckin: WeeklyCheckin | null
  workoutSessionsThisWeek: number
  totalSetsThisWeek: number
}

function getRollingRange(daysAgo: number) {
  const now = new Date()
  const end = new Date(now)
  end.setDate(now.getDate() - daysAgo)
  const start = new Date(end)
  start.setDate(end.getDate() - 7)
  return {
    start: start.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  }
}

function avg(logs: WeightLog[]) {
  if (!logs.length) return null
  return logs.reduce((s, l) => s + l.weight_lbs, 0) / logs.length
}

function ratingLabel(val: number | null) {
  if (val === null) return '—'
  if (val >= 8) return `${val}/10 ✓`
  if (val >= 6) return `${val}/10`
  return `${val}/10 ⚠`
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

    const thisWeek = getRollingRange(0)
    const lastWeek = getRollingRange(7)

    const [
      { data: wThis },
      { data: wLast },
      { data: checkins },
      { data: sessions },
      { data: sets },
    ] = await Promise.all([
      supabase.from('weight_logs').select('*').eq('client_id', client.id).gte('date', thisWeek.start).lte('date', thisWeek.end),
      supabase.from('weight_logs').select('*').eq('client_id', client.id).gte('date', lastWeek.start).lte('date', lastWeek.end),
      supabase.from('weekly_checkins').select('*').eq('client_id', client.id).order('week_start', { ascending: false }).limit(2),
      supabase.from('workout_sessions').select('id').eq('client_id', client.id).gte('session_date', thisWeek.start),
      supabase.from('set_logs').select('id').eq('client_id', client.id).gte('created_at', thisWeek.start + 'T00:00:00'),
    ])

    setData({
      weightThisWeek: wThis || [],
      weightLastWeek: wLast || [],
      latestCheckin: checkins?.[0] || null,
      priorCheckin: checkins?.[1] || null,
      workoutSessionsThisWeek: sessions?.length || 0,
      totalSetsThisWeek: sets?.length || 0,
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

  const thisAvg = avg(data.weightThisWeek)
  const lastAvg = avg(data.weightLastWeek)
  const weightDiff = thisAvg && lastAvg ? thisAvg - lastAvg : null
  const latestWeight = data.weightThisWeek.sort((a, b) => b.date.localeCompare(a.date))[0]
  const c = data.latestCheckin
  const prev = data.priorCheckin

  // Generate insights
  const insights: { text: string; type: 'good' | 'warn' | 'neutral' }[] = []

  if (!c) {
    insights.push({ text: 'No check-in submitted this week.', type: 'warn' })
  } else {
    if (c.energy_level !== null && c.energy_level <= 4) insights.push({ text: `Energy is low (${c.energy_level}/10) — may need deload or recovery focus.`, type: 'warn' })
    if (c.sleep_quality !== null && c.sleep_quality <= 4) insights.push({ text: `Sleep quality is poor (${c.sleep_quality}/10) — worth addressing.`, type: 'warn' })
    if (c.stress_level !== null && c.stress_level >= 7) insights.push({ text: `High stress reported (${c.stress_level}/10) — consider adjusting training intensity.`, type: 'warn' })
    if (c.adherence_nutrition !== null && c.adherence_nutrition >= 8) insights.push({ text: `Strong nutrition adherence this week (${c.adherence_nutrition}/10).`, type: 'good' })
    if (c.adherence_nutrition !== null && c.adherence_nutrition <= 4) insights.push({ text: `Nutrition adherence was low (${c.adherence_nutrition}/10) — revisit meal plan.`, type: 'warn' })
    if (c.adherence_training !== null && c.adherence_training >= 8) insights.push({ text: `Consistent with training (${c.adherence_training}/10).`, type: 'good' })
    if (prev && c.energy_level !== null && prev.energy_level !== null) {
      const diff = c.energy_level - prev.energy_level
      if (diff >= 3) insights.push({ text: `Energy improved significantly from last week (+${diff}).`, type: 'good' })
      if (diff <= -3) insights.push({ text: `Energy dropped from last week (${diff}).`, type: 'warn' })
    }
  }

  if (weightDiff !== null) {
    if (Math.abs(weightDiff) < 0.3) insights.push({ text: 'Weight is stable week-over-week.', type: 'neutral' })
    else if (weightDiff < 0) insights.push({ text: `Down ${Math.abs(weightDiff).toFixed(1)} lbs on weekly average — on track.`, type: 'good' })
    else insights.push({ text: `Up ${weightDiff.toFixed(1)} lbs on weekly average — review if intended.`, type: 'warn' })
  } else if (data.weightThisWeek.length === 0) {
    insights.push({ text: 'No weight logged this week — remind them to track daily.', type: 'warn' })
  }

  if (data.workoutSessionsThisWeek === 0) {
    insights.push({ text: 'No workout sessions logged this week.', type: 'warn' })
  } else {
    insights.push({ text: `${data.workoutSessionsThisWeek} workout session${data.workoutSessionsThisWeek > 1 ? 's' : ''} logged (${data.totalSetsThisWeek} total sets).`, type: 'good' })
  }

  if (client.goal_weight_lbs && latestWeight) {
    const toGoal = latestWeight.weight_lbs - client.goal_weight_lbs
    if (toGoal > 0) insights.push({ text: `${toGoal.toFixed(1)} lbs from goal weight of ${client.goal_weight_lbs} lbs.`, type: 'neutral' })
    else insights.push({ text: `Goal weight of ${client.goal_weight_lbs} lbs reached!`, type: 'good' })
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: '#C9A84C' }} />
          <span className="text-sm font-semibold text-white">Weekly Brief</span>
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
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>
          {/* Weight */}
          <div className="pt-3">
            <p className="text-[#555] text-xs uppercase tracking-wider mb-2">Weight</p>
            <div className="flex items-center gap-3 flex-wrap">
              {latestWeight ? (
                <span className="text-white font-semibold">{latestWeight.weight_lbs} lbs</span>
              ) : (
                <span className="text-[#555] text-sm">No logs this week</span>
              )}
              {weightDiff !== null && (
                <span className="flex items-center gap-1 text-xs font-medium" style={{ color: weightDiff < 0 ? '#4ade80' : weightDiff > 0 ? '#f87171' : '#888' }}>
                  {weightDiff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : weightDiff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} lbs vs last week
                </span>
              )}
            </div>
          </div>

          {/* Check-in ratings */}
          {c && (
            <div>
              <p className="text-[#555] text-xs uppercase tracking-wider mb-2">Check-in — {new Date(c.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {[
                  { label: 'Energy', val: c.energy_level },
                  { label: 'Sleep', val: c.sleep_quality },
                  { label: 'Stress', val: c.stress_level },
                  { label: 'Nutrition', val: c.adherence_nutrition },
                  { label: 'Training', val: c.adherence_training },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-[#666]">{label}</span>
                    <span className={val !== null && val <= 4 ? 'text-red-400' : val !== null && val >= 8 ? 'text-green-400' : 'text-[#aaa]'}>
                      {ratingLabel(val)}
                    </span>
                  </div>
                ))}
              </div>
              {c.notes && (
                <p className="text-[#888] text-xs mt-2 italic">"{c.notes}"</p>
              )}
              {c.three_wins && (
                <div className="mt-2">
                  <p className="text-[#555] text-xs mb-0.5">Wins</p>
                  <p className="text-[#aaa] text-xs">{c.three_wins}</p>
                </div>
              )}
              {c.three_struggles && (
                <div className="mt-2">
                  <p className="text-[#555] text-xs mb-0.5">Struggles</p>
                  <p className="text-[#aaa] text-xs">{c.three_struggles}</p>
                </div>
              )}
            </div>
          )}

          {/* Workouts */}
          <div>
            <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Workouts this week</p>
            <p className="text-white text-sm">{data.workoutSessionsThisWeek} session{data.workoutSessionsThisWeek !== 1 ? 's' : ''}, {data.totalSetsThisWeek} sets logged</p>
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div>
              <p className="text-[#555] text-xs uppercase tracking-wider mb-2">Recommendations</p>
              <div className="space-y-1.5">
                {insights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 shrink-0" style={{ color: ins.type === 'good' ? '#4ade80' : ins.type === 'warn' ? '#f87171' : '#888' }}>
                      {ins.type === 'good' ? '↑' : ins.type === 'warn' ? '!' : '·'}
                    </span>
                    <span className="text-[#bbb]">{ins.text}</span>
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
