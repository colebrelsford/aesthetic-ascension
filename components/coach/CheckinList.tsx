'use client'

import { WeeklyCheckin } from '@/lib/types'
import { ClipboardList } from 'lucide-react'

interface Props {
  checkins: WeeklyCheckin[]
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
      <p className="text-zinc-400 text-xs font-medium">{question}</p>
      <p className="text-zinc-200 text-sm leading-relaxed bg-zinc-800 rounded-lg px-3 py-2">{answer}</p>
    </div>
  )
}

export default function CheckinList({ checkins }: Props) {
  if (checkins.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
        No check-ins submitted yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {checkins.map(c => (
        <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-zinc-400" />
            <h3 className="font-medium text-white text-sm">
              Week of {new Date(c.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Bar value={c.energy_level} label="Energy" />
            <Bar value={c.sleep_quality} label="Sleep Quality" />
            <Bar value={c.stress_level} label="Stress" />
            <Bar value={c.adherence_nutrition} label="Nutrition Adherence" />
            <Bar value={c.adherence_training} label="Training Adherence" />
          </div>

          <div className="space-y-3">
            <QA question="Did you stick to the diet?" answer={c.diet_adherence} />
            <QA question="Cardio adherence this week?" answer={c.cardio_adherence} />
            <QA question="3 wins this week" answer={c.three_wins} />
            <QA question="3 struggles this week" answer={c.three_struggles} />
            <QA question="What could you have done better?" answer={c.could_do_better} />
            <QA question="Progression this week" answer={c.progression_notes} />
          </div>
        </div>
      ))}
    </div>
  )
}
