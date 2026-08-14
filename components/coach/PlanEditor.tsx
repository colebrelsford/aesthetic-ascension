'use client'

import { useState } from 'react'
import { Plan } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, Timer } from 'lucide-react'

function htmlToText(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface Props {
  clientId: string
  plan: Plan | null
  onSaved: (plan: Plan) => void
}

export default function PlanEditor({ clientId, plan, onSaved }: Props) {
  const [notes, setNotes] = useState(htmlToText(plan?.training_split))
  const [cardioType, setCardioType] = useState(plan?.cardio_type || '')
  const [cardioDuration, setCardioDuration] = useState(plan?.cardio_duration_min?.toString() || '')
  const [cardioSessions, setCardioSessions] = useState(plan?.cardio_sessions_per_week?.toString() || '')
  const [cardioNotes, setCardioNotes] = useState(plan?.cardio_notes || '')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    const { data, error } = await supabase
      .from('plans')
      .upsert({
        ...(plan?.id ? { id: plan.id } : {}),
        client_id: clientId,
        training_split: notes,
        cardio_type: cardioType || null,
        cardio_duration_min: cardioDuration ? parseInt(cardioDuration) : null,
        cardio_sessions_per_week: cardioSessions ? parseInt(cardioSessions) : null,
        cardio_notes: cardioNotes || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    setSaving(false)
    if (error) { toast.error('Failed to save'); return }
    toast.success('Saved!')
    onSaved(data)
  }

  const cardStyle = { background: '#111', border: '1px solid rgba(201,168,76,0.15)' }
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)' }

  return (
    <div className="space-y-4">
      {/* Cardio targets */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
            <Timer className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          </div>
          <h3 className="font-semibold text-white text-sm">Cardio Targets</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          <div className="space-y-1.5">
            <Label className="text-[#666] text-xs uppercase tracking-wider">Type</Label>
            <Input value={cardioType} onChange={e => setCardioType(e.target.value)}
              placeholder="e.g. Incline walk" className="text-white h-9 text-sm rounded-xl" style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#666] text-xs uppercase tracking-wider">Duration (min)</Label>
            <Input type="number" value={cardioDuration} onChange={e => setCardioDuration(e.target.value)}
              placeholder="0" className="text-white h-9 text-sm rounded-xl" style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#666] text-xs uppercase tracking-wider">Sessions / week</Label>
            <Input type="number" value={cardioSessions} onChange={e => setCardioSessions(e.target.value)}
              placeholder="0" className="text-white h-9 text-sm rounded-xl" style={inputStyle} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[#666] text-xs uppercase tracking-wider">Notes</Label>
          <Input value={cardioNotes} onChange={e => setCardioNotes(e.target.value)}
            placeholder="e.g. Fasted, post-workout, incline 10 speed 3.0"
            className="text-white h-9 text-sm rounded-xl" style={inputStyle} />
        </div>
      </div>

      {/* Plan notes */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white text-sm">Plan Notes</h3>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-black transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)' }}>
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="General notes for this client — training reminders, guidance, etc."
          rows={6}
          className="w-full rounded-xl px-3 py-2.5 text-sm text-white resize-y"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)', outline: 'none' }}
        />
      </div>
    </div>
  )
}
