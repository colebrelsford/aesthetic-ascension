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
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('profiles').select('current_phase,phase_start_date,phase_end_date,phase_notes').eq('id', clientId).single()
      .then(({ data }) => {
        if (data) {
          setPhase(data.current_phase || '')
          setStartDate(data.phase_start_date || '')
          setEndDate((data as any).phase_end_date || '')
          setNotes(data.phase_notes || '')
        }
      })
  }, [clientId])

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      current_phase: phase || null,
      phase_start_date: startDate || null,
      phase_end_date: endDate || null,
      phase_notes: notes || null,
    }).eq('id', clientId)
    setSaving(false)
    if (error) { toast.error('Failed to save'); return }
    toast.success('Phase saved!')
  }

  // Timeline calculations
  const now = Date.now()
  const startMs = startDate ? new Date(startDate).getTime() : null
  const endMs = endDate ? new Date(endDate).getTime() : null

  const weeksIn = startMs !== null
    ? Math.floor((now - startMs) / (7 * 86400000))
    : null

  const totalWeeks = startMs !== null && endMs !== null
    ? Math.round((endMs - startMs) / (7 * 86400000))
    : null

  const weeksRemaining = endMs !== null
    ? Math.ceil((endMs - now) / (7 * 86400000))
    : null

  const progressPct = startMs !== null && endMs !== null && endMs > startMs
    ? Math.min(100, Math.max(0, Math.round(((now - startMs) / (endMs - startMs)) * 100)))
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
          <h3 className="font-semibold text-white text-sm">Phase Timeline</h3>
          {phase && weeksIn !== null && weeksIn >= 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}>
              Week {weeksIn + 1}{totalWeeks ? ` of ${totalWeeks}` : ''}
            </span>
          )}
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-black disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
          <Save className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
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
        <div className="space-y-1.5">
          <label className="text-[#666] text-xs uppercase tracking-wider">End date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm" style={inputStyle} />
        </div>
      </div>

      {/* Progress bar — only when both dates set */}
      {progressPct !== null && startDate && endDate && (
        <div className="space-y-2">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #C9A84C, #E8C97A)' }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">{progressPct}% complete</span>
            <div className="flex items-center gap-3">
              {weeksIn !== null && weeksIn >= 0 && (
                <span style={{ color: '#C9A84C' }}>Week {weeksIn + 1}</span>
              )}
              {weeksRemaining !== null && (
                <span className="text-zinc-500">
                  {weeksRemaining > 0 ? `${weeksRemaining}w remaining` : 'Phase complete'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats row — only when dates are set */}
      {(weeksIn !== null || totalWeeks !== null) && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Weeks in', val: weeksIn !== null && weeksIn >= 0 ? `${weeksIn + 1}` : '—' },
            { label: 'Total weeks', val: totalWeeks !== null ? `${totalWeeks}` : '—' },
            { label: 'Weeks left', val: weeksRemaining !== null ? (weeksRemaining > 0 ? `${weeksRemaining}` : '0') : '—' },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-xl py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-lg font-bold text-white">{val}</p>
              <p className="text-zinc-600 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[#666] text-xs uppercase tracking-wider">Phase notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Goals for this phase, key adjustments, check-in targets…"
          rows={3} className="w-full rounded-xl px-3 py-2.5 text-sm text-white resize-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)', outline: 'none' }} />
      </div>
    </div>
  )
}
