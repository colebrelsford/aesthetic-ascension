'use client'

import { Measurement } from '@/lib/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

interface Props {
  history: Measurement[]
}

const LINES = [
  { key: 'waist_in', label: 'Waist', color: '#C9A84C' },
  { key: 'hips_in', label: 'Hips', color: '#E8C97A' },
  { key: 'chest_in', label: 'Chest', color: '#a78bfa' },
  { key: 'left_arm_in', label: 'Arm', color: '#60a5fa' },
  { key: 'left_quad_in', label: 'Quad', color: '#34d399' },
]

export default function MeasurementsChart({ history }: Props) {
  if (history.length < 2) return null

  const data = [...history]
    .reverse()
    .map(m => ({
      date: new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      waist_in: m.waist_in,
      hips_in: m.hips_in,
      chest_in: m.chest_in,
      left_arm_in: m.left_arm_in,
      left_quad_in: m.left_quad_in,
    }))

  return (
    <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.15)' }}>
      <p className="text-sm font-semibold text-white mb-4">Measurements Over Time</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} width={32} unit='"' />
          <Tooltip
            contentStyle={{ background: '#141414', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', color: '#fff', fontSize: 12 }}
            labelStyle={{ color: '#888' }}
            formatter={(v) => [`${v}"`, '']}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />
          {LINES.map(l => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.label}
              stroke={l.color}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
