'use client'

import { useState } from 'react'
import { WeeklyCheckin } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { ClipboardList, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  checkins: WeeklyCheckin[]
}

const cardStyle = { background: '#111', border: '1px solid rgba(201,168,76,0.15)' }

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-[#888]">{label}</span>
        <span className="font-semibold" style={{ color: '#C9A84C' }}>{value}/10</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: `${value * 10}%`, background: 'linear-gradient(90deg, #C9A84C, #E8C97A)' }} />
      </div>
    </div>
  )
}

function QA({ question, answer }: { question: string; answer: string | null }) {
  if (!answer) return null
  return (
    <div className="space-y-1">
      <p className="text-[#555] text-xs font-medium uppercase tracking-wider">{question}</p>
      <p className="text-[#ccc] text-sm leading-relaxed rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>{answer}</p>
    </div>
  )
}

function FeedbackBox({ checkin }: { checkin: WeeklyCheckin }) {
  const [feedback, setFeedback] = useState(checkin.coach_feedback || '')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function save() {
    setSaving(true)
    const { error } = await supabase
      .from('weekly_checkins')
      .update({ coach_feedback: feedback.trim() || null })
      .eq('id', checkin.id)
    setSaving(false)
    if (error) { toast.error('Failed to save feedback'); return }
    toast.success('Feedback saved — client can now see it')
  }

  return (
    <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>
      <div className="flex items-center gap-2">
        <MessageSquare className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#C9A84C' }}>Your Feedback</p>
        <span className="text-[#444] text-xs">(visible to client)</span>
      </div>
      <textarea
        value={feedback}
        onChange={e => setFeedback(e.target.value)}
        placeholder="Leave feedback for this client's check-in…"
        rows={3}
        className="w-full text-sm text-white rounded-xl px-3 py-2.5 resize-none outline-none"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)' }}
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-xs font-semibold px-4 py-1.5 rounded-lg text-black disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}
      >
        {saving ? 'Saving…' : 'Save Feedback'}
      </button>
    </div>
  )
}

export default function CheckinList({ checkins }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (checkins.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center text-[#555] text-sm" style={cardStyle}>
        No check-ins submitted yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {checkins.map(c => (
        <div key={c.id} className="rounded-2xl overflow-hidden" style={cardStyle}>
          <button
            onClick={() => setExpanded(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(201,168,76,0.12)' }}>
                <ClipboardList className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
              </div>
              <div className="text-left">
                <span className="font-semibold text-white text-sm">
                  Week of {new Date(c.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                {c.coach_feedback && (
                  <p className="text-xs mt-0.5" style={{ color: '#C9A84C' }}>Feedback left ✓</p>
                )}
              </div>
            </div>
            {expanded[c.id] ? <ChevronDown className="w-4 h-4 text-[#555]" /> : <ChevronRight className="w-4 h-4 text-[#555]" />}
          </button>

          {expanded[c.id] && (
            <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                <Bar value={c.energy_level} label="Energy" />
                <Bar value={c.sleep_quality} label="Sleep Quality" />
                <Bar value={c.stress_level} label="Stress" />
                <Bar value={c.adherence_nutrition} label="Nutrition Adherence" />
                <Bar value={c.adherence_training} label="Training Adherence" />
              </div>
              <div className="space-y-3">
                <QA question="Did you stick to the diet?" answer={c.diet_adherence} />
                <QA question="Cardio adherence" answer={c.cardio_adherence} />
                <QA question="3 wins" answer={c.three_wins} />
                <QA question="3 struggles" answer={c.three_struggles} />
                <QA question="Could have done better" answer={c.could_do_better} />
                <QA question="Progression" answer={c.progression_notes} />
              </div>
              <FeedbackBox checkin={c} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
