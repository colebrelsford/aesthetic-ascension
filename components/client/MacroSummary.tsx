'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flame } from 'lucide-react'

interface MacroTarget {
  id: string
  name: string
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface Props {
  clientId: string
}

export default function MacroSummary({ clientId }: Props) {
  const [target, setTarget] = useState<MacroTarget | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('macro_targets').select('id,name,protein_g,carbs_g,fat_g')
        .eq('client_id', clientId).order('created_at').limit(1).single()
      if (data) setTarget(data)
    }
    load()
  }, [clientId])

  if (!target) return null

  const calories = Math.round(target.protein_g * 4 + target.carbs_g * 4 + target.fat_g * 9)

  return (
    <div className="rounded-2xl p-4" style={{
      background: 'linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(18,18,18,0.95) 100%)',
      border: '1px solid rgba(201,168,76,0.2)',
    }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.15)' }}>
          <Flame className="w-3 h-3" style={{ color: '#C9A84C' }} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#C9A84C' }}>
          Daily Macro Targets
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Calories', val: calories, unit: 'kcal', color: '#C9A84C' },
          { label: 'Protein',  val: target.protein_g, unit: 'g', color: '#60a5fa' },
          { label: 'Carbs',    val: target.carbs_g,   unit: 'g', color: '#34d399' },
          { label: 'Fat',      val: target.fat_g,     unit: 'g', color: '#f87171' },
        ].map(({ label, val, unit, color }) => (
          <div key={label} className="text-center rounded-xl py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xl font-bold" style={{ color }}>{val}</p>
            <p className="text-zinc-600 text-xs">{unit}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
