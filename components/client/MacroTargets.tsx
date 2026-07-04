'use client'

import { Plan } from '@/lib/types'
import { Flame } from 'lucide-react'

interface Props {
  plan: Plan | null
}

const macros = (plan: Plan) => [
  { label: 'Calories', value: plan.calories, unit: 'kcal' },
  { label: 'Protein', value: plan.protein_g, unit: 'g' },
  { label: 'Carbs', value: plan.carbs_g, unit: 'g' },
  { label: 'Fat', value: plan.fat_g, unit: 'g' },
]

export default function MacroTargets({ plan }: Props) {
  if (!plan || (!plan.calories && !plan.protein_g && !plan.carbs_g && !plan.fat_g)) return null

  return (
    <div className="rounded-2xl p-5" style={{
      background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(28,28,28,0.9) 100%)',
      border: '1px solid rgba(201,168,76,0.25)',
    }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
          background: 'rgba(201,168,76,0.15)',
        }}>
          <Flame className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
        </div>
        <h3 className="font-semibold text-white text-sm">Daily Targets</h3>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {macros(plan).map(m => m.value != null && (
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
  )
}
