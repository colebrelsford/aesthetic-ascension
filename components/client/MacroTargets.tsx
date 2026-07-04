'use client'

import { Plan } from '@/lib/types'
import { Flame } from 'lucide-react'

interface Props {
  plan: Plan | null
}

export default function MacroTargets({ plan }: Props) {
  if (!plan || (!plan.calories && !plan.protein_g && !plan.carbs_g && !plan.fat_g)) return null

  const macros = [
    { label: 'Calories', value: plan.calories, unit: 'kcal', color: 'text-orange-400' },
    { label: 'Protein', value: plan.protein_g, unit: 'g', color: 'text-blue-400' },
    { label: 'Carbs', value: plan.carbs_g, unit: 'g', color: 'text-yellow-400' },
    { label: 'Fat', value: plan.fat_g, unit: 'g', color: 'text-pink-400' },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-zinc-400" />
        <h3 className="font-medium text-white text-sm">Daily Targets</h3>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {macros.map(m => m.value != null && (
          <div key={m.label} className="text-center">
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-zinc-500 text-xs">{m.unit}</p>
            <p className="text-zinc-400 text-xs mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
