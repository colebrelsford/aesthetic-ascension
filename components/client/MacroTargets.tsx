'use client'

import { Plan } from '@/lib/types'
import { Flame, Timer } from 'lucide-react'

interface Props {
  plan: Plan | null
}

export default function MacroTargets({ plan }: Props) {
  if (!plan) return null

  const hasMacros = plan.calories || plan.protein_g || plan.carbs_g || plan.fat_g
  const hasCardio = plan.cardio_type || plan.cardio_duration_min || plan.cardio_sessions_per_week

  if (!hasMacros && !hasCardio) return null

  return (
    <div className="space-y-3">
      {hasMacros && (
        <div className="rounded-2xl p-5" style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(28,28,28,0.9) 100%)',
          border: '1px solid rgba(201,168,76,0.25)',
        }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.15)' }}>
              <Flame className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
            </div>
            <h3 className="font-semibold text-white text-sm">Daily Targets</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Calories', value: plan.calories, unit: 'kcal' },
              { label: 'Protein', value: plan.protein_g, unit: 'g' },
              { label: 'Carbs', value: plan.carbs_g, unit: 'g' },
              { label: 'Fat', value: plan.fat_g, unit: 'g' },
            ].map(m => m.value != null && (
              <div key={m.label} className="rounded-xl p-3 text-center" style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(201,168,76,0.12)',
              }}>
                <p className="text-xl font-bold" style={{
                  background: 'linear-gradient(135deg, #C9A84C, #E8C97A)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>{m.value}</p>
                <p className="text-[#666] text-xs mt-0.5">{m.unit}</p>
                <p className="text-[#888] text-xs">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasCardio && (
        <div className="rounded-2xl p-5" style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(20,20,20,0.9) 100%)',
          border: '1px solid rgba(201,168,76,0.2)',
        }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
              <Timer className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
            </div>
            <h3 className="font-semibold text-white text-sm">Cardio Target</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {plan.cardio_type && (
              <div className="rounded-xl px-4 py-2.5 text-center" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.12)' }}>
                <p className="font-semibold" style={{ color: '#C9A84C' }}>{plan.cardio_type}</p>
                <p className="text-[#666] text-xs mt-0.5">Type</p>
              </div>
            )}
            {plan.cardio_duration_min && (
              <div className="rounded-xl px-4 py-2.5 text-center" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.12)' }}>
                <p className="text-xl font-bold" style={{ color: '#C9A84C' }}>{plan.cardio_duration_min}</p>
                <p className="text-[#666] text-xs mt-0.5">min / session</p>
              </div>
            )}
            {plan.cardio_sessions_per_week && (
              <div className="rounded-xl px-4 py-2.5 text-center" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.12)' }}>
                <p className="text-xl font-bold" style={{ color: '#C9A84C' }}>{plan.cardio_sessions_per_week}x</p>
                <p className="text-[#666] text-xs mt-0.5">per week</p>
              </div>
            )}
          </div>
          {plan.cardio_notes && (
            <p className="text-[#888] text-xs mt-2">{plan.cardio_notes}</p>
          )}
        </div>
      )}
    </div>
  )
}
