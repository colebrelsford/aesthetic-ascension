'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Measurement } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Ruler, BarChart2 } from 'lucide-react'
import MeasurementsChart from './MeasurementsChart'

interface Props {
  clientId: string
}

const FIELDS: { key: keyof Measurement; label: string }[] = [
  { key: 'waist_in', label: 'Waist' },
  { key: 'hips_in', label: 'Hips' },
  { key: 'chest_in', label: 'Chest' },
  { key: 'left_arm_in', label: 'Left Arm' },
  { key: 'right_arm_in', label: 'Right Arm' },
  { key: 'left_quad_in', label: 'Left Quad' },
  { key: 'right_quad_in', label: 'Right Quad' },
]

const cardStyle = { background: '#111', border: '1px solid rgba(201,168,76,0.15)' }
const inputStyle = { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(201,168,76,0.2)' }

export default function MeasurementsLogger({ clientId }: Props) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [values, setValues] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<Measurement[]>([])
  const [saving, setSaving] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('measurements')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setHistory(data) })
  }, [clientId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const hasAny = FIELDS.some(f => values[f.key as string])
    if (!hasAny) { toast.error('Enter at least one measurement'); return }
    setSaving(true)

    const payload: Record<string, unknown> = { client_id: clientId, date }
    FIELDS.forEach(f => {
      payload[f.key as string] = values[f.key as string] ? parseFloat(values[f.key as string]) : null
    })

    const { data, error } = await supabase
      .from('measurements')
      .upsert(payload, { onConflict: 'client_id,date' })
      .select()
      .single()

    setSaving(false)
    if (error) { toast.error('Failed to save'); return }
    toast.success('Measurements saved!')
    setHistory(prev => {
      const filtered = prev.filter(m => m.date !== date)
      return [data, ...filtered].sort((a, b) => b.date.localeCompare(a.date))
    })
    setValues({})
  }

  const last = history[0]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
              <Ruler className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
            </div>
            <h3 className="font-semibold text-white text-sm">Log Measurements <span className="text-[#555] font-normal">(inches)</span></h3>
          </div>
          {history.length >= 2 && (
            <button
              onClick={() => setShowChart(!showChart)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
              style={showChart
                ? { background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#888' }
              }
            >
              <BarChart2 className="w-3.5 h-3.5" />
              {showChart ? 'Hide chart' : 'View chart'}
            </button>
          )}
        </div>

        {last && (
          <div className="rounded-xl px-4 py-3 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[#555] text-xs mb-2">Last logged — {new Date(last.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {FIELDS.map(f => last[f.key] != null && (
                <span key={f.key as string} className="text-[#888] text-xs">
                  {f.label}: <span className="text-white font-medium">{last[f.key] as number}"</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[#666] text-xs uppercase tracking-wider">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-white w-40 rounded-xl" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FIELDS.map(f => (
              <div key={f.key as string} className="space-y-1.5">
                <Label className="text-[#666] text-xs">{f.label}</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={values[f.key as string] || ''}
                  onChange={(e) => setValues(prev => ({ ...prev, [f.key as string]: e.target.value }))}
                  placeholder='0.0"'
                  className="text-white rounded-xl"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
            {saving ? 'Saving…' : 'Save Measurements'}
          </button>
        </form>
      </div>

      {showChart && <MeasurementsChart history={history} />}

      {history.length > 1 && (
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
            <h4 className="text-sm font-semibold text-white">History</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th className="text-left px-5 py-3 text-[#555] font-medium">Date</th>
                  {FIELDS.map(f => <th key={f.key as string} className="text-left px-3 py-3 text-[#555] font-medium whitespace-nowrap">{f.label}</th>)}
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
