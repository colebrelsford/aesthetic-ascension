'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WeeklyCheckin } from '@/lib/types'
import { ClipboardList, ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  clientId: string
}

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white font-medium">{value}/10</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-white rounded-full" style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  )
}

function QA({ question, answer }: { question: string; answer: string | null }) {
  if (!answer) return null
  return (
    <div className="space-y-1">
      <p className="text-zinc-500 text-xs font-medium">{question}</p>
      <p className="text-zinc-200 text-sm leading-relaxed">{answer}</p>
    </div>
  )
}

export default function CheckinHistory({ clientId }: Props) {
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('weekly_checkins')
      .select('*')
      .eq('client_id', clientId)
      .order('week_start', { ascending: false })
      .then(({ data }) => { if (data) setCheckins(data) })
  }, [clientId])

  if (checkins.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
        No check-ins submitted yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {checkins.map(c => (
        <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpanded(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-zinc-400" />
              <span className="font-medium text-white text-sm">
                Week of {new Date(c.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            {expanded[c.id]
              ? <ChevronDown className="w-4 h-4 text-zinc-500" />
              : <ChevronRight className="w-4 h-4 text-zinc-500" />
            }
          </button>

          {expanded[c.id] && (
            <div className="px-4 pb-4 space-y-4 border-t border-zinc-800 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Bar value={c.energy_level} label="Energy" />
                <Bar value={c.sleep_quality} label="Sleep Quality" />
                <Bar value={c.stress_level} label="Stress" />
                <Bar value={c.adherence_nutrition} label="Nutrition Adherence" />
                <Bar value={c.adherence_training} label="Training Adherence" />
              </div>
              <div className="space-y-3 pt-1">
                <QA question="Diet adherence" answer={c.diet_adherence} />
                <QA question="Cardio adherence" answer={c.cardio_adherence} />
                <QA question="3 wins" answer={c.three_wins} />
                <QA question="3 struggles" answer={c.three_struggles} />
                <QA question="Could have done better" answer={c.could_do_better} />
                <QA question="Progression" answer={c.progression_notes} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
