'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Measurement } from '@/lib/types'
import { Ruler } from 'lucide-react'

interface Props {
  clientId: string
}

const FIELDS: { key: keyof Measurement; label: string }[] = [
  { key: 'waist_in', label: 'Waist' },
  { key: 'hips_in', label: 'Hips' },
  { key: 'chest_in', label: 'Chest' },
  { key: 'left_arm_in', label: 'L. Arm' },
  { key: 'right_arm_in', label: 'R. Arm' },
  { key: 'left_quad_in', label: 'L. Quad' },
  { key: 'right_quad_in', label: 'R. Quad' },
]

const cardStyle = {
  background: '#111',
  border: '1px solid rgba(201,168,76,0.15)',
}

export default function ClientMeasurements({ clientId }: Props) {
  const [history, setHistory] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('measurements')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setHistory(data)
        setLoading(false)
      })
  }, [clientId])

  if (loading) return (
    <div className="rounded-2xl p-8 text-center text-[#555] text-sm" style={cardStyle}>
      Loading measurements…
    </div>
  )

  if (history.length === 0) return (
    <div className="rounded-2xl p-8 text-center text-[#555] text-sm" style={cardStyle}>
      No measurements logged yet.
    </div>
  )

  const latest = history[0]
  const prev = history[1]

  function diff(key: keyof Measurement) {
    if (!prev || latest[key] == null || prev[key] == null) return null
    return (latest[key] as number) - (prev[key] as number)
  }

  return (
    <div className="space-y-4">
      {/* Latest snapshot */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
            <Ruler className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Latest Measurements</h3>
            <p className="text-[#555] text-xs">
              {new Date(latest.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FIELDS.map(f => {
            const val = latest[f.key]
            const d = diff(f.key)
            if (val == null) return null
            return (
              <div key={f.key as string} className="rounded-xl p-3 text-center" style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(201,168,76,0.1)',
              }}>
                <p className="text-lg font-bold text-white">{val as number}"</p>
                <p className="text-[#888] text-xs mt-0.5">{f.label}</p>
                {d !== null && (
                  <p className={`text-xs mt-1 font-medium ${d < 0 ? 'text-green-400' : d > 0 ? 'text-red-400' : 'text-[#555]'}`}>
                    {d > 0 ? '+' : ''}{d.toFixed(2)}"
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* History table */}
      {history.length > 1 && (
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
            <h4 className="text-sm font-semibold text-white">Measurement History</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th className="text-left px-5 py-3 text-[#555] font-medium">Date</th>
                  {FIELDS.map(f => (
                    <th key={f.key as string} className="text-left px-3 py-3 text-[#555] font-medium whitespace-nowrap">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((m, i) => (
                  <tr key={m.id} style={{ borderBottom: i < history.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                    <td className="px-5 py-3 text-[#888] whitespace-nowrap">
                      {new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    {FIELDS.map(f => (
                      <td key={f.key as string} className="px-3 py-3 text-white">
                        {m[f.key] != null ? `${m[f.key]}"` : <span className="text-[#444]">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
