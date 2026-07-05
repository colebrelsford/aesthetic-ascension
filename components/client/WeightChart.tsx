'use client'

import { useState } from 'react'
import { WeightLog } from '@/lib/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { TrendingDown, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  logs: WeightLog[]
  clientId: string
  goalWeight: number | null
  onGoalSaved: (goal: number | null) => void
}

const cardStyle = { background: '#111', border: '1px solid rgba(201,168,76,0.15)' }

export default function WeightChart({ logs, clientId, goalWeight, onGoalSaved }: Props) {
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState(goalWeight?.toString() || '')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function saveGoal() {
    setSaving(true)
    const val = goalInput ? parseFloat(goalInput) : null
    const { error } = await supabase.from('profiles').update({ goal_weight_lbs: val }).eq('id', clientId)
    setSaving(false)
    if (error) { toast.error('Failed to save goal'); return }
    onGoalSaved(val)
    setEditingGoal(false)
    toast.success(val ? `Goal set: ${val} lbs` : 'Goal removed')
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center text-[#555] text-sm py-10" style={cardStyle}>
        No weight data yet. Log your first weigh-in above.
      </div>
    )
  }

  const data = logs.map(l => ({
    date: new Date(l.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: l.weight_lbs,
  }))

  const latest = logs[logs.length - 1]?.weight_lbs
  const first = logs[0]?.weight_lbs
  const change = latest - first
  const toGoal = goalWeight ? latest - goalWeight : null

  return (
    <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
            <TrendingDown className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          </div>
          <h3 className="font-semibold text-white text-sm">Weight Progress</h3>
        </div>
        <div className="flex items-center gap-4 text-sm flex-wrap justify-end">
          <span className="text-[#888]">Current: <span className="text-white font-semibold">{latest} lbs</span></span>
          <span className={change <= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
            {change > 0 ? '+' : ''}{change.toFixed(1)} lbs total
          </span>
          {toGoal !== null && (
            <span className="font-medium" style={{ color: '#C9A84C' }}>
              {toGoal > 0 ? `${toGoal.toFixed(1)} lbs to goal` : '🎯 Goal reached!'}
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{ background: '#141414', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', color: '#fff' }}
            labelStyle={{ color: '#888' }}
          />
          <Line type="monotone" dataKey="weight" stroke="#C9A84C" strokeWidth={2.5} dot={{ fill: '#C9A84C', r: 3 }} activeDot={{ r: 5 }} />
          {goalWeight && (
            <ReferenceLine y={goalWeight} stroke="#E8C97A" strokeDasharray="5 4" strokeWidth={1.5} label={{ value: `Goal: ${goalWeight}`, fill: '#E8C97A', fontSize: 10, position: 'insideTopRight' }} />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Goal weight */}
      <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-1.5 text-[#555] text-xs">
          <Target className="w-3.5 h-3.5" />
          <span>Goal weight:</span>
        </div>
        {editingGoal ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              placeholder="e.g. 175"
              className="w-24 text-sm text-white rounded-lg px-2 py-1"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.3)' }}
              autoFocus
            />
            <button onClick={saveGoal} disabled={saving} className="text-xs font-semibold px-3 py-1 rounded-lg text-black" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
              {saving ? '…' : 'Save'}
            </button>
            <button onClick={() => setEditingGoal(false)} className="text-xs text-[#555] hover:text-white">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setEditingGoal(true)} className="text-xs hover:text-white transition-colors" style={{ color: goalWeight ? '#C9A84C' : '#555' }}>
            {goalWeight ? `${goalWeight} lbs — edit` : 'Set a goal'}
          </button>
        )}
      </div>
    </div>
  )
}
