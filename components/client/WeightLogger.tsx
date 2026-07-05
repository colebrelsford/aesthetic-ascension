'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WeightLog } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Scale } from 'lucide-react'

interface Props {
  clientId: string
  onLogged: (log: WeightLog) => void
}

const cardStyle = { background: '#111', border: '1px solid rgba(201,168,76,0.15)' }
const inputStyle = { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(201,168,76,0.2)' }

export default function WeightLogger({ clientId, onLogged }: Props) {
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!weight) return
    setLoading(true)

    const { data, error } = await supabase
      .from('weight_logs')
      .upsert(
        { client_id: clientId, date, weight_lbs: parseFloat(weight), notes: notes.trim() || null },
        { onConflict: 'client_id,date' }
      )
      .select()
      .single()

    setLoading(false)
    if (error) { toast.error('Failed to log weight'); return }
    toast.success('Weight logged!')
    onLogged(data)
    setWeight('')
    setNotes('')
  }

  return (
    <div className="rounded-2xl p-5" style={cardStyle}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
          <Scale className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
        </div>
        <h3 className="font-semibold text-white text-sm">Log Weight</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-[#666] text-xs uppercase tracking-wider">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-white w-40 rounded-xl"
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#666] text-xs uppercase tracking-wider">Weight (lbs)</Label>
            <Input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="185.0"
              className="text-white w-32 rounded-xl"
              style={inputStyle}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[#666] text-xs uppercase tracking-wider">Notes <span className="normal-case text-[#444]">(optional — e.g. "morning weight", "bloated")</span></Label>
          <Input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any context for today's weigh-in…"
            className="text-white rounded-xl"
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !weight}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}
        >
          {loading ? 'Saving…' : 'Log Weight'}
        </button>
      </form>
    </div>
  )
}
