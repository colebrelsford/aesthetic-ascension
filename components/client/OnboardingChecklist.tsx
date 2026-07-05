'use client'

import { useState } from 'react'
import { CheckCircle, Circle, X } from 'lucide-react'

interface Props {
  hasWeight: boolean
  hasCheckin: boolean
  hasPhoto: boolean
  notificationsEnabled: boolean
}

export default function OnboardingChecklist({ hasWeight, hasCheckin, hasPhoto, notificationsEnabled }: Props) {
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' && !!localStorage.getItem('onboarding-dismissed')
  )

  const items = [
    { label: 'Log your first weight', done: hasWeight },
    { label: 'Upload a profile photo', done: hasPhoto },
    { label: 'Enable notifications', done: notificationsEnabled },
    { label: 'Submit your first check-in', done: hasCheckin },
  ]

  const allDone = items.every(i => i.done)
  const doneCount = items.filter(i => i.done).length

  if (dismissed || allDone) return null

  function dismiss() {
    localStorage.setItem('onboarding-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="rounded-2xl p-5" style={{
      background: 'linear-gradient(135deg, rgba(201,168,76,0.07) 0%, rgba(20,20,20,0.9) 100%)',
      border: '1px solid rgba(201,168,76,0.2)',
    }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-white text-sm">Get set up</p>
          <p className="text-[#888] text-xs mt-0.5">{doneCount}/{items.length} complete</p>
        </div>
        <button onClick={dismiss} className="text-[#444] hover:text-[#888]">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full mb-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all" style={{
          width: `${(doneCount / items.length) * 100}%`,
          background: 'linear-gradient(90deg, #C9A84C, #E8C97A)',
        }} />
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-2.5">
            {item.done
              ? <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#C9A84C' }} />
              : <Circle className="w-4 h-4 shrink-0 text-[#444]" />
            }
            <span className={`text-sm ${item.done ? 'line-through text-[#555]' : 'text-[#ccc]'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
