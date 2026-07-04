'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Measurement } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Ruler } from 'lucide-react'

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

export default function MeasurementsLogger({ clientId }: Props) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [values, setValues] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<Measurement[]>([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('measurements')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .limit(10)
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
  }

  const last = history[0]

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Ruler className="w-4 h-4 text-zinc-400" />
          <h3 className="font-medium text-white">Log Measurements</h3>
          <span className="text-zinc-500 text-xs">(inches)</span>
        </div>

        {last && (
          <div className="bg-zinc-800 rounded-lg p-3 mb-4">
            <p className="text-zinc-500 text-xs mb-2">Last logged — {new Date(last.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {FIELDS.map(f => last[f.key] != null && (
                <span key={f.key as string} className="text-zinc-300 text-xs">
                  {f.label}: <span className="text-white font-medium">{last[f.key] as number}"</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-zinc-400 text-xs">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white w-40"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FIELDS.map(f => (
              <div key={f.key as string} className="space-y-1">
                <Label className="text-zinc-400 text-xs">{f.label}</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={values[f.key as string] || ''}
                  onChange={(e) => setValues(prev => ({ ...prev, [f.key as string]: e.target.value }))}
                  placeholder='0.0"'
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            ))}
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-white text-black hover:bg-zinc-200 font-medium">
            {saving ? 'Saving…' : 'Save Measurements'}
          </Button>
        </form>
      </div>

      {history.length > 1 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h4 className="text-sm font-medium text-white">Measurement History</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-2 text-zinc-500 font-medium">Date</th>
                  {FIELDS.map(f => (
                    <th key={f.key as string} className="text-left px-3 py-2 text-zinc-500 font-medium whitespace-nowrap">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {history.map(m => (
                  <tr key={m.id}>
                    <td className="px-4 py-2 text-zinc-400 whitespace-nowrap">
                      {new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    {FIELDS.map(f => (
                      <td key={f.key as string} className="px-3 py-2 text-white">
                        {m[f.key] != null ? `${m[f.key]}"` : '—'}
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
