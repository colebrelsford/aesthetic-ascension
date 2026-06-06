'use client'

import { WeightLog } from '@/lib/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingDown } from 'lucide-react'

interface Props {
  logs: WeightLog[]
}

export default function WeightChart({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center text-zinc-500 text-sm py-10">
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

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-zinc-400" />
          <h3 className="font-medium text-white">Weight Progress</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-400">Current: <span className="text-white font-medium">{latest} lbs</span></span>
          <span className={change <= 0 ? 'text-green-400' : 'text-red-400'}>
            {change > 0 ? '+' : ''}{change.toFixed(1)} lbs
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}
            labelStyle={{ color: '#a1a1aa' }}
          />
          <Line type="monotone" dataKey="weight" stroke="#ffffff" strokeWidth={2} dot={{ fill: '#fff', r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
