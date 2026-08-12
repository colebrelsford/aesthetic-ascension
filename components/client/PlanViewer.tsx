'use client'

import { Plan } from '@/lib/types'
import MealPlanViewer from './MealPlanViewer'
import { UtensilsCrossed } from 'lucide-react'

interface Props {
  plan: Plan | null
  clientId: string
}

export default function PlanViewer({ plan, clientId }: Props) {
  return (
    <div className="space-y-4">
      <MealPlanViewer clientId={clientId} />

      {plan?.training_split && (
        <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.1)' }}>
              <UtensilsCrossed className="w-3 h-3" style={{ color: '#C9A84C' }} />
            </div>
            <h3 className="font-semibold text-white text-sm">Plan Notes</h3>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">{plan.training_split}</p>
        </div>
      )}
    </div>
  )
}
