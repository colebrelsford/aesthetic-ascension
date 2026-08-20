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
  calories_override: number | null
  notes: string | null
}

interface Props {
  clientId: string
}

function DonutChart({ protein, carbs, fat, caloriesOverride }: { protein: number; carbs: number; fat: number; caloriesOverride?: number | null }) {
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
        <p className="text-2xl font-bold" style={{ color: '#C9A84C' }}>{caloriesOverride ?? Math.round(total)}</p>
        <p className="text-zinc-500 text-xs">kcal / day</p>
      </div>
    </div>
  )
}

const STEPS = [
  { n: 1, text: 'Download MyNetDiary from the App Store or Google Play and create a free account. Skip the guided setup — you\'ll use your coach\'s targets instead.' },
  { n: 2, text: 'Set your macro targets manually: go to More → Goals → Nutrients Goal and enter the exact protein, carbs, and fat numbers your coach gave you. Do not use the app\'s auto-calculated goals.' },
  { n: 3, text: 'Log every meal before you eat it. Tap the + button, search for the food, and always select the version with the most specific data (grams, not "1 serving" when possible).' },
  { n: 4, text: 'Weigh everything on a kitchen scale and enter the exact gram amount. Do not estimate. A handful of rice or a "medium" chicken breast can vary by 50–100+ calories — that compounds over a week.' },
  { n: 5, text: 'Use the barcode scanner for any packaged food. Tap the barcode icon in the search bar, scan the package, and confirm the serving size matches what you actually ate.' },
  { n: 6, text: 'Check your daily totals throughout the day — not just at the end. If you\'re short on protein by dinner, you still have time to adjust. Hitting totals after the fact doesn\'t count.' },
  { n: 7, text: 'Log cooking oils, sauces, and condiments. These are easy to skip but a tablespoon of oil is ~120 calories. Use cooking spray instead to eliminate the tracking altogether.' },
  { n: 8, text: 'At the end of each day, review your diary. If you consistently miss a macro, bring it to your coach at check-in so we can adjust the plan or your food choices.' },
]

export default function MacroTargetViewer({ clientId }: Props) {
  const [plans, setPlans] = useState<MacroTarget[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      // Try meal plan foods first
      const { data: mealPlans } = await supabase
        .from('meal_plan_plans').select('id, name').eq('client_id', clientId).order('display_order').limit(1)

      if (mealPlans && mealPlans.length > 0) {
        const plan = mealPlans[0]
        const { data: meals } = await supabase.from('meal_plan_meals').select('id').eq('plan_id', plan.id)
        if (meals && meals.length > 0) {
          const { data: foods } = await supabase
            .from('meal_plan_foods').select('protein_g, carbs_g, fat_g, calories').in('meal_id', meals.map(m => m.id))
          if (foods && foods.length > 0) {
            const protein = Math.round(foods.reduce((s, f) => s + (f.protein_g ?? 0), 0))
            const carbs = Math.round(foods.reduce((s, f) => s + (f.carbs_g ?? 0), 0))
            const fat = Math.round(foods.reduce((s, f) => s + (f.fat_g ?? 0), 0))
            const cals = Math.round(foods.reduce((s, f) => s + (f.calories ?? 0), 0))
            const syntheticPlan: MacroTarget = { id: 'meal_plan', name: plan.name, protein_g: protein, carbs_g: carbs, fat_g: fat, calories_override: cals, notes: null }
            setPlans([syntheticPlan])
            setSelectedId('meal_plan')
            setLoading(false)
            return
          }
        }
      }

      // Fall back to macro_targets table
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
  const computedCalories = Math.round(target.protein_g * 4 + target.carbs_g * 4 + target.fat_g * 9)
  const calories = target.calories_override || computedCalories

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

        <DonutChart protein={target.protein_g} carbs={target.carbs_g} fat={target.fat_g} caloriesOverride={target.calories_override} />

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
