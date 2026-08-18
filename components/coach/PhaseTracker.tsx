'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Target, Save } from 'lucide-react'

const PHASES = ['Growth / Bulk', 'Mini Cut', 'Fat Loss', 'Maintenance / Hold', 'Contest Prep', 'Recomp']

interface Props {
  clientId: string
}

export default function PhaseTracker({ clientId }: Props) {
  const [phase, setPhase] = useState('')
  const [startDate, setStartDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('profiles').select('current_phase,phase_start_date,phase_notes').eq('id', clientId).single()
      .then(({ data }) => {
        if (data) {
          setPhase(data.current_phase || '')
          setStartDate(data.phase_start_date || '')
          setNotes(data.phase_notes || '')
        }
      })
  }, [clientId])

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      current_phase: phase || null,
      phase_start_date: startDate || null,
      phase_notes: notes || null,
    }).eq('id', clientId)
    setSaving(false)
    if (error) { toast.error('Failed to save'); return }
    toast.success('Phase saved!')
  }

  const weeksIn = startDate
    ? Math.floor((Date.now() - new Date(startDate).getTime()) / (7 * 86400000))
    : null

  const cardStyle = { background: '#111', border: '1px solid rgba(201,168,76,0.15)' }
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)', color: 'white' }

  return (
    <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
            <Target className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          </div>
          <h3 className="font-semibold text-white text-sm">Current Phase</h3>
          {phase && weeksIn !== null && weeksIn >= 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}>
              Week {weeksIn + 1}
            </span>
          )}
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-black disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
          <Save className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[#666] text-xs uppercase tracking-wider">Phase</label>
          <select value={phase} onChange={e => setPhase(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm" style={inputStyle}>
            <option value="">— Not set —</option>
            {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[#666] text-xs uppercase tracking-wider">Start date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm" style={inputStyle} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[#666] text-xs uppercase tracking-wider">Phase notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Goals for this phase, expected duration, key adjustments…"
          rows={3} className="w-full rounded-xl px-3 py-2.5 text-sm text-white resize-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)', outline: 'none' }} />
      </div>
    </div>
  )
}
