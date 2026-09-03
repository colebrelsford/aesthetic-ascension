'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Target, Save, RotateCcw } from 'lucide-react'

const PHASES = ['Growth / Bulk', 'Mini Cut', 'Fat Loss', 'Maintenance / Hold', 'Contest Prep', 'Recomp']

interface Props {
  clientId: string
}

export default function PhaseTracker({ clientId }: Props) {
  const [phase, setPhase] = useState('')
  const [notes, setNotes] = useState('')
  const [weekStartDate, setWeekStartDate] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('profiles')
      .select('current_phase, phase_start_date, phase_notes')
      .eq('id', clientId)
      .single()
      .then(({ data }) => {
        if (data) {
          setPhase(data.current_phase || '')
          setWeekStartDate(data.phase_start_date || null)
          setNotes(data.phase_notes || '')
        }
      })
  }, [clientId])

  // Current week number — calculated from phase_start_date
  const currentWeek = weekStartDate
    ? Math.floor((Date.now() - new Date(weekStartDate).getTime()) / (7 * 86400000)) + 1
    : null

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      current_phase: phase || null,
      phase_notes: notes || null,
    }).eq('id', clientId)
    setSaving(false)
    if (error) { toast.error('Failed to save'); return }
    toast.success('Phase saved!')
  }

  async function resetWeekCounter() {
    setResetting(true)
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('profiles').update({
      phase_start_date: today,
    }).eq('id', clientId)
    setResetting(false)
    if (error) { toast.error('Failed to reset'); return }
    setWeekStartDate(today)
    toast.success('Week counter reset to Week 1')
  }

  const cardStyle = { background: '#111', border: '1px solid rgba(201,168,76,0.15)' }
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)', color: 'white' }

  return (
    <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
            <Target className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          </div>
          <h3 className="font-semibold text-white text-sm">Phase Tracker</h3>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-black disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
          <Save className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Week counter display */}
      <div className="flex items-center gap-4">
        <div className="rounded-2xl px-6 py-4 text-center flex-1" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
          {currentWeek !== null && currentWeek > 0 ? (
            <>
              <p className="text-4xl font-bold" style={{ color: '#C9A84C' }}>{currentWeek}</p>
              <p className="text-zinc-500 text-xs mt-1 uppercase tracking-wider">Current Week</p>
              {weekStartDate && (
                <p className="text-zinc-600 text-xs mt-1">
                  Started {new Date(weekStartDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-zinc-600">—</p>
              <p className="text-zinc-600 text-xs mt-1">No counter started</p>
            </>
          )}
        </div>
        <button
          onClick={resetWeekCounter}
          disabled={resetting}
          className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl text-xs font-medium transition-colors disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#888' }}
          title="Reset to Week 1"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{resetting ? 'Resetting…' : 'Reset to\nWeek 1'}</span>
        </button>
      </div>

      {/* Phase selector */}
      <div className="space-y-1.5">
        <label className="text-[#666] text-xs uppercase tracking-wider">Phase</label>
        <select value={phase} onChange={e => setPhase(e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm" style={inputStyle}>
          <option value="">— Not set —</option>
          {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Phase notes */}
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
