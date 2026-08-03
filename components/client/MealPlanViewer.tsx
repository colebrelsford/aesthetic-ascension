'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UtensilsCrossed } from 'lucide-react'

interface MealPlan {
  id: string
  name: string
  display_order: number
}

interface MealPlanMeal {
  id: string
  plan_id: string
  name: string
  display_order: number
}

interface MealPlanFood {
  id: string
  meal_id: string
  food_name: string
  brand_name: string | null
  quantity: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface Props {
  clientId: string
}

function round1(n: number) { return Math.round(n * 10) / 10 }

export default function MealPlanViewer({ clientId }: Props) {
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [meals, setMeals] = useState<MealPlanMeal[]>([])
  const [foods, setFoods] = useState<Record<string, MealPlanFood[]>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadPlans() {
      const { data } = await supabase
        .from('meal_plan_plans').select('*').eq('client_id', clientId).order('display_order')
      if (data && data.length > 0) {
        setPlans(data)
        setSelectedPlanId(data[0].id)
      }
      setLoading(false)
    }
    loadPlans()
  }, [clientId])

  useEffect(() => {
    if (!selectedPlanId) return
    async function loadMeals() {
      const { data: mealData } = await supabase
        .from('meal_plan_meals').select('*').eq('plan_id', selectedPlanId).order('display_order')
      if (!mealData || mealData.length === 0) { setMeals([]); setFoods({}); return }
      setMeals(mealData)
      const { data: foodData } = await supabase
        .from('meal_plan_foods').select('*').eq('client_id', clientId).order('display_order')
      const mealIds = new Set(mealData.map(m => m.id))
      const grouped: Record<string, MealPlanFood[]> = {}
      for (const f of (foodData || [])) {
        if (!mealIds.has(f.meal_id)) continue
        if (!grouped[f.meal_id]) grouped[f.meal_id] = []
        grouped[f.meal_id].push(f)
      }
      setFoods(grouped)
    }
    loadMeals()
  }, [selectedPlanId])

  if (loading) return null

  if (plans.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
        <UtensilsCrossed className="w-6 h-6 mx-auto mb-2 text-zinc-700" />
        <p className="text-zinc-600 text-sm">Your coach hasn&apos;t built your meal plan yet.</p>
      </div>
    )
  }

  const allFoods = Object.values(foods).flat()
  const daily = {
    cal: Math.round(allFoods.reduce((s, f) => s + f.calories, 0)),
    pro: round1(allFoods.reduce((s, f) => s + f.protein_g, 0)),
    carb: round1(allFoods.reduce((s, f) => s + f.carbs_g, 0)),
    fat: round1(allFoods.reduce((s, f) => s + f.fat_g, 0)),
  }

  return (
    <div className="space-y-4">
      {/* Plan switcher */}
      {plans.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {plans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={selectedPlanId === plan.id
                ? { background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#000' }
                : { background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: '#888' }
              }
            >
              {plan.name}
            </button>
          ))}
        </div>
      )}

      {/* Daily total */}
      <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)' }}>
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
          Daily Total{plans.length > 1 ? ` — ${plans.find(p => p.id === selectedPlanId)?.name}` : ''}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Calories', val: daily.cal, unit: 'kcal', color: '#C9A84C' },
            { label: 'Protein', val: daily.pro, unit: 'g', color: '#60a5fa' },
            { label: 'Carbs', val: daily.carb, unit: 'g', color: '#34d399' },
            { label: 'Fat', val: daily.fat, unit: 'g', color: '#f87171' },
          ].map(({ label, val, unit, color }) => (
            <div key={label} className="text-center rounded-xl py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xl font-bold" style={{ color }}>{val}</p>
              <p className="text-zinc-600 text-xs">{unit}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Meals */}
      {meals.map(meal => {
        const mealFoods = foods[meal.id] || []
        const mealCal = Math.round(mealFoods.reduce((s, f) => s + f.calories, 0))
        const mealPro = round1(mealFoods.reduce((s, f) => s + f.protein_g, 0))
        const mealCarb = round1(mealFoods.reduce((s, f) => s + f.carbs_g, 0))
        const mealFat = round1(mealFoods.reduce((s, f) => s + f.fat_g, 0))

        return (
          <div key={meal.id} className="rounded-2xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: mealFoods.length > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <span className="font-semibold text-white text-sm">{meal.name}</span>
              {mealFoods.length > 0 && (
                <span className="text-zinc-600 text-xs">{mealCal} kcal · {mealPro}g P · {mealCarb}g C · {mealFat}g F</span>
              )}
            </div>
            {mealFoods.length === 0 ? (
              <p className="px-4 py-3 text-zinc-700 text-xs italic">No foods added yet</p>
            ) : (
              mealFoods.map((food, i) => (
                <div key={food.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: i < mealFoods.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-200 text-sm font-medium truncate">{food.food_name}</p>
                    <p className="text-zinc-600 text-xs">
                      {food.brand_name && <span className="mr-1">{food.brand_name} ·</span>}
                      {food.quantity}g
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span className="text-zinc-300 font-semibold">{food.calories} kcal</span>
                    <span className="text-blue-400">{food.protein_g}g P</span>
                    <span className="text-green-400">{food.carbs_g}g C</span>
                    <span className="text-red-400">{food.fat_g}g F</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )
      })}

      {meals.length === 0 && (
        <p className="text-zinc-700 text-sm text-center py-4">No meals in this plan yet.</p>
      )}
    </div>
  )
}
