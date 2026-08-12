'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flame, Smartphone } from 'lucide-react'
import TrackingTips from './TrackingTips'

interface MacroTarget {
  id: string
  name: string
  protein_g: number
  carbs_g: number
  fat_g: number
  notes: string | null
}

interface Props {
  clientId: string
}

function DonutChart({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const proteinCal = protein * 4
  const carbsCal = carbs * 4
  const fatCal = fat * 9
  const total = proteinCal + carbsCal + fatCal
  if (total === 0) return null

  const cx = 80, cy = 80, r = 60, strokeW = 18
  const circ = 2 * Math.PI * r
  const proteinPct = proteinCal / total
  const carbsPct = carbsCal / total

  function seg(value: number, offset: number) {
    return { dash: (value / total) * circ, offset: -offset * circ }
  }

  const p = seg(proteinCal, 0)
  const c = seg(carbsCal, proteinPct)
  const f = seg(fatCal, proteinPct + carbsPct)

  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeW} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#60a5fa" strokeWidth={strokeW}
          strokeDasharray={`${p.dash} ${circ}`} strokeDashoffset={p.offset} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#34d399" strokeWidth={strokeW}
          strokeDasharray={`${c.dash} ${circ}`} strokeDashoffset={c.offset} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f87171" strokeWidth={strokeW}
          strokeDasharray={`${f.dash} ${circ}`} strokeDashoffset={f.offset} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold" style={{ color: '#C9A84C' }}>{Math.round(total)}</p>
        <p className="text-zinc-500 text-xs">kcal / day</p>
      </div>
    </div>
  )
}

const STEPS = [
  { n: 1, text: 'Download MyNetDiary from the App Store or Google Play.' },
  { n: 2, text: "Create a free account. Skip the guided setup — you'll use your coach's targets instead." },
  { n: 3, text: 'Tap the + button to log a meal. Search for the food, pick the right item, and set your portion.' },
  { n: 4, text: 'Check your daily totals at the bottom of the diary screen. Aim to hit the targets your coach set above.' },
  { n: 5, text: "Don't stress about being exact — within ±10g on protein and ±50 kcal is close enough." },
]

export default function MacroTargetViewer({ clientId }: Props) {
  const [plans, setPlans] = useState<MacroTarget[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('macro_targets').select('*').eq('client_id', clientId).order('created_at')
      if (data && data.length > 0) {
        setPlans(data)
        setSelectedId(data[0].id)
      }
      setLoading(false)
    }
    load()
  }, [clientId])

  if (loading || plans.length === 0) return null

  const target = plans.find(p => p.id === selectedId) ?? plans[0]
  const calories = Math.round(target.protein_g * 4 + target.carbs_g * 4 + target.fat_g * 9)

  return (
    <div className="space-y-4">
      {/* Plan switcher */}
      {plans.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {plans.map(plan => (
            <button key={plan.id} onClick={() => setSelectedId(plan.id)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={selectedId === plan.id
                ? { background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#000' }
                : { background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>
              {plan.name}
            </button>
          ))}
        </div>
      )}

      {/* Chart card */}
      <div className="rounded-2xl p-5 space-y-5" style={{
        background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(18,18,18,0.95) 100%)',
        border: '1px solid rgba(201,168,76,0.25)',
      }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.15)' }}>
            <Flame className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          </div>
          <h3 className="font-semibold text-white text-sm">
            {target.name}{plans.length > 1 ? ' — Daily Targets' : ' Daily Targets'}
          </h3>
        </div>

        <DonutChart protein={target.protein_g} carbs={target.carbs_g} fat={target.fat_g} />

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Protein', g: target.protein_g, kcal: target.protein_g * 4, color: '#60a5fa' },
            { label: 'Carbs',   g: target.carbs_g,   kcal: target.carbs_g * 4,   color: '#34d399' },
            { label: 'Fat',     g: target.fat_g,     kcal: target.fat_g * 9,     color: '#f87171' },
          ].map(({ label, g, kcal, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xl font-bold" style={{ color }}>{g}g</p>
              <p className="text-zinc-600 text-xs mt-0.5">{Math.round(kcal)} kcal</p>
              <p className="text-zinc-500 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {calories > 0 && (
          <div className="flex gap-3 text-xs justify-center flex-wrap">
            {[
              { label: 'Protein', pct: Math.round((target.protein_g * 4 / calories) * 100), color: '#60a5fa' },
              { label: 'Carbs',   pct: Math.round((target.carbs_g * 4 / calories) * 100),   color: '#34d399' },
              { label: 'Fat',     pct: Math.round((target.fat_g * 9 / calories) * 100),     color: '#f87171' },
            ].map(({ label, pct, color }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                <span style={{ color }}>{pct}%</span>
                <span className="text-zinc-600">{label}</span>
              </span>
            ))}
          </div>
        )}

        {target.notes && (
          <div className="rounded-xl px-4 py-3 text-sm text-zinc-300 leading-relaxed" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {target.notes}
          </div>
        )}
      </div>

      <TrackingTips />

      {/* How to track */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <h3 className="font-semibold text-white text-sm">How to track with MyNetDiary</h3>
        </div>
        <div className="space-y-3">
          {STEPS.map(({ n, text }) => (
            <div key={n} className="flex gap-3">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>{n}</span>
              <p className="text-zinc-400 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl px-4 py-3 text-xs text-zinc-500 leading-relaxed" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <strong className="text-zinc-400">Tip:</strong> Use the barcode scanner in MyNetDiary for packaged foods — it's the fastest way to log accurately.
        </div>
      </div>
    </div>
  )
}
