'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, Search, X, Loader2, UtensilsCrossed, ChevronDown } from 'lucide-react'

interface MealPlan {
  id: string
  client_id: string
  name: string
  display_order: number
}

interface MealPlanMeal {
  id: string
  client_id: string
  plan_id: string
  name: string
  display_order: number
}

interface MealPlanFood {
  id: string
  meal_id: string
  client_id: string
  food_name: string
  brand_name: string | null
  quantity: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  calories_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
}

interface SearchResult {
  id: string
  name: string
  brand: string | null
  cal100: number
  pro100: number
  carb100: number
  fat100: number
  servingSize: number | null    // grams per serving
  servingUnit: string | null    // e.g. "1 slice", "1 cup"
}

interface Props {
  clientId: string
}

const DEFAULT_MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

function round1(n: number) { return Math.round(n * 10) / 10 }
function calcMacro(per100: number, qty: number) { return round1((per100 * qty) / 100) }

async function searchFoods(query: string): Promise<SearchResult[]> {
  const key = 'o5yw2wzrBFTgCwJzyUtdBQ8I1rHlHJX1vjrCyz4L'
  const results: SearchResult[] = []

  await Promise.allSettled([
    // USDA Foundation + SR Legacy — generics (chicken breast, ground beef, rice, etc.)
    fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=${key}&pageSize=15&dataType=Foundation,SR%20Legacy`)
      .then(r => r.json())
      .then(data => {
        for (const f of (data.foods || [])) {
          const get = (id: number) => (f.foodNutrients || []).find((n: { nutrientId: number; value: number }) => n.nutrientId === id)?.value ?? 0
          const cal = get(1008)
          if (!cal) continue
          results.push({
            id: `usda-gen-${f.fdcId}`,
            name: f.description,
            brand: null,
            cal100: Math.round(cal),
            pro100: get(1003),
            carb100: get(1005),
            fat100: get(1004),
            servingSize: f.servingSize ?? null,
            servingUnit: f.servingSizeUnit ? `${f.householdServingFullText || ''} (${f.servingSize}${f.servingSizeUnit})`.trim() : null,
          })
        }
      }),

    // USDA Branded — packaged/branded products with serving size
    fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=${key}&pageSize=15&dataType=Branded`)
      .then(r => r.json())
      .then(data => {
        for (const f of (data.foods || [])) {
          const get = (id: number) => (f.foodNutrients || []).find((n: { nutrientId: number; value: number }) => n.nutrientId === id)?.value ?? 0
          const cal = get(1008)
          if (!cal) continue
          const servingG = f.servingSize && f.servingSizeUnit?.toLowerCase() === 'g' ? f.servingSize : null
          results.push({
            id: `usda-brand-${f.fdcId}`,
            name: f.description,
            brand: f.brandOwner || f.brandName || null,
            cal100: Math.round(cal),
            pro100: get(1003),
            carb100: get(1005),
            fat100: get(1004),
            servingSize: servingG,
            servingUnit: f.householdServingFullText || (servingG ? `${servingG}g` : null),
          })
        }
      }),

    // Open Food Facts — extra branded/international coverage
    fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=10&fields=code,product_name,brands,nutriments,serving_size,serving_quantity`)
      .then(r => r.json())
      .then(data => {
        for (const p of (data.products || [])) {
          const cal = p.nutriments?.['energy-kcal_100g'] ?? p.nutriments?.['energy-kcal']
          if (!cal || !p.product_name) continue
          results.push({
            id: `off-${p.code || Math.random()}`,
            name: p.product_name,
            brand: p.brands || null,
            cal100: Math.round(cal),
            pro100: p.nutriments?.['proteins_100g'] ?? 0,
            carb100: p.nutriments?.['carbohydrates_100g'] ?? 0,
            fat100: p.nutriments?.['fat_100g'] ?? 0,
            servingSize: p.serving_quantity ?? null,
            servingUnit: p.serving_size || null,
          })
        }
      }),
  ])

  // Deduplicate by name+brand, generics first
  const seen = new Set<string>()
  const deduped: SearchResult[] = []
  for (const r of results) {
    const key = `${r.name.toLowerCase()}|${(r.brand || '').toLowerCase()}`
    if (!seen.has(key)) { seen.add(key); deduped.push(r) }
  }
  return deduped.slice(0, 30)
}

export default function MealPlanBuilder({ clientId }: Props) {
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [meals, setMeals] = useState<MealPlanMeal[]>([])
  const [foods, setFoods] = useState<Record<string, MealPlanFood[]>>({})
  const [addingFoodTo, setAddingFoodTo] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<SearchResult | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [useServings, setUseServings] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customMealName, setCustomMealName] = useState('')
  const [addingCustomMeal, setAddingCustomMeal] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [addingPlan, setAddingPlan] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const supabase = createClient()

  useEffect(() => { loadPlans() }, [clientId])
  useEffect(() => { if (selectedPlanId) loadMeals(selectedPlanId) }, [selectedPlanId])

  async function loadPlans() {
    const { data } = await supabase
      .from('meal_plan_plans').select('*').eq('client_id', clientId).order('display_order')
    if (data && data.length > 0) {
      setPlans(data)
      setSelectedPlanId(data[0].id)
    }
  }

  async function loadMeals(planId: string) {
    const { data: mealData } = await supabase
      .from('meal_plan_meals').select('*').eq('plan_id', planId).order('display_order')
    if (!mealData) return
    setMeals(mealData)
    if (mealData.length === 0) { setFoods({}); return }
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

  async function addPlan() {
    if (!newPlanName.trim()) return
    const { data, error } = await supabase.from('meal_plan_plans').insert({
      client_id: clientId, name: newPlanName.trim(), display_order: plans.length,
    }).select().single()
    if (error || !data) { toast.error('Failed to create plan'); return }
    setPlans(prev => [...prev, data])
    setSelectedPlanId(data.id)
    setMeals([])
    setFoods({})
    setNewPlanName('')
    setAddingPlan(false)
    toast.success(`"${data.name}" plan created`)
  }

  async function deletePlan(planId: string) {
    if (!confirm('Delete this plan and all its meals/foods?')) return
    await supabase.from('meal_plan_plans').delete().eq('id', planId)
    const remaining = plans.filter(p => p.id !== planId)
    setPlans(remaining)
    if (selectedPlanId === planId) {
      const next = remaining[0] || null
      setSelectedPlanId(next?.id || null)
      if (!next) { setMeals([]); setFoods({}) }
    }
    toast.success('Plan deleted')
  }

  async function addDefaultMeals() {
    if (!selectedPlanId) return
    const rows = DEFAULT_MEALS.map((name, i) => ({ client_id: clientId, plan_id: selectedPlanId, name, display_order: i }))
    const { data, error } = await supabase.from('meal_plan_meals').insert(rows).select()
    if (error || !data) { toast.error('Failed to create meals'); return }
    setMeals(data)
  }

  async function addCustomMeal() {
    if (!customMealName.trim() || !selectedPlanId) return
    const { data, error } = await supabase.from('meal_plan_meals').insert({
      client_id: clientId, plan_id: selectedPlanId, name: customMealName.trim(), display_order: meals.length,
    }).select().single()
    if (error || !data) { toast.error('Failed to add meal'); return }
    setMeals(prev => [...prev, data])
    setCustomMealName('')
    setAddingCustomMeal(false)
  }

  async function deleteMeal(mealId: string) {
    await supabase.from('meal_plan_meals').delete().eq('id', mealId)
    setMeals(prev => prev.filter(m => m.id !== mealId))
    setFoods(prev => { const n = { ...prev }; delete n[mealId]; return n })
  }

  function handleSearch(q: string) {
    setSearchQuery(q)
    setSelectedFood(null)
    clearTimeout(searchTimeout.current)
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    searchTimeout.current = setTimeout(async () => {
      const results = await searchFoods(q)
      setSearchResults(results)
      setSearching(false)
    }, 500)
  }

  function openSearch(mealId: string) {
    setAddingFoodTo(mealId)
    setSearchQuery('')
    setSearchResults([])
    setSelectedFood(null)
    setQuantity('100')
    setUseServings(false)
  }

  function closeSearch() {
    setAddingFoodTo(null)
    setSearchQuery('')
    setSearchResults([])
    setSelectedFood(null)
    setQuantity('100')
    setUseServings(false)
  }

  async function addFoodToMeal() {
    if (!selectedFood || !addingFoodTo) return
    const enteredQty = parseFloat(quantity) || 1
    const grams = useServings && selectedFood.servingSize
      ? enteredQty * selectedFood.servingSize
      : enteredQty
    const displayQty = useServings && selectedFood.servingSize
      ? grams
      : enteredQty
    setSaving(true)
    const { data, error } = await supabase.from('meal_plan_foods').insert({
      meal_id: addingFoodTo,
      client_id: clientId,
      food_name: selectedFood.name,
      brand_name: selectedFood.brand,
      quantity: Math.round(displayQty),
      unit: 'g',
      calories: calcMacro(selectedFood.cal100, grams),
      protein_g: calcMacro(selectedFood.pro100, grams),
      carbs_g: calcMacro(selectedFood.carb100, grams),
      fat_g: calcMacro(selectedFood.fat100, grams),
      calories_per_100g: selectedFood.cal100,
      protein_per_100g: selectedFood.pro100,
      carbs_per_100g: selectedFood.carb100,
      fat_per_100g: selectedFood.fat100,
      display_order: (foods[addingFoodTo] || []).length,
    }).select().single()
    setSaving(false)
    if (error || !data) { toast.error('Failed to add food'); return }
    setFoods(prev => ({ ...prev, [addingFoodTo]: [...(prev[addingFoodTo] || []), data] }))
    setSelectedFood(null)
    setSearchQuery('')
    setSearchResults([])
    setQuantity('100')
    toast.success(`${selectedFood.name} added`)
  }

  async function deleteFood(mealId: string, foodId: string) {
    await supabase.from('meal_plan_foods').delete().eq('id', foodId)
    setFoods(prev => ({ ...prev, [mealId]: prev[mealId].filter(f => f.id !== foodId) }))
  }

  const allFoods = Object.values(foods).flat()
  const daily = {
    cal: Math.round(allFoods.reduce((s, f) => s + f.calories, 0)),
    pro: round1(allFoods.reduce((s, f) => s + f.protein_g, 0)),
    carb: round1(allFoods.reduce((s, f) => s + f.carbs_g, 0)),
    fat: round1(allFoods.reduce((s, f) => s + f.fat_g, 0)),
  }
  const qty = parseFloat(quantity) || 1
  // Convert to grams for macro calculation
  const qtyGrams = useServings && selectedFood?.servingSize
    ? qty * selectedFood.servingSize
    : qty
  const preview = selectedFood ? {
    cal: calcMacro(selectedFood.cal100, qtyGrams),
    pro: calcMacro(selectedFood.pro100, qtyGrams),
    carb: calcMacro(selectedFood.carb100, qtyGrams),
    fat: calcMacro(selectedFood.fat100, qtyGrams),
  } : null

  // No plans yet
  if (plans.length === 0 && !addingPlan) {
    return (
      <div className="rounded-2xl p-12 text-center" style={{ background: '#111', border: '1px dashed rgba(201,168,76,0.2)' }}>
        <UtensilsCrossed className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
        <p className="text-zinc-400 text-sm font-medium mb-1">No meal plans yet</p>
        <p className="text-zinc-600 text-xs mb-6">Create a plan to start building (e.g. "High Day", "Low Day", "Standard")</p>
        <button
          onClick={() => setAddingPlan(true)}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}
        >
          <Plus className="w-4 h-4 inline mr-1.5" />Create first plan
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Plan selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {plans.map(plan => (
          <div key={plan.id} className="flex items-center gap-1">
            <button
              onClick={() => setSelectedPlanId(plan.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={selectedPlanId === plan.id
                ? { background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#000' }
                : { background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: '#888' }
              }
            >
              {plan.name}
            </button>
            {selectedPlanId === plan.id && plans.length > 1 && (
              <button onClick={() => deletePlan(plan.id)} className="text-zinc-700 hover:text-red-400 transition-colors p-1" title="Delete plan">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {addingPlan ? (
          <div className="flex items-center gap-2">
            <Input
              value={newPlanName}
              onChange={e => setNewPlanName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addPlan(); if (e.key === 'Escape') setAddingPlan(false) }}
              placeholder="Plan name (e.g. High Day)"
              className="bg-zinc-900 border-zinc-800 text-white text-sm h-9 w-48"
              autoFocus
            />
            <button onClick={addPlan} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>Add</button>
            <button onClick={() => setAddingPlan(false)} className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 bg-zinc-900">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setAddingPlan(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
          >
            <Plus className="w-3 h-3" /> Add plan
          </button>
        )}
      </div>

      {selectedPlanId && (
        <>
          {/* Daily total */}
          <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)' }}>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
              Daily Total — {plans.find(p => p.id === selectedPlanId)?.name}
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Calories', val: daily.cal, unit: 'kcal', color: '#C9A84C' },
                { label: 'Protein', val: daily.pro, unit: 'g', color: '#60a5fa' },
                { label: 'Carbs', val: daily.carb, unit: 'g', color: '#34d399' },
                { label: 'Fat', val: daily.fat, unit: 'g', color: '#f87171' },
              ].map(({ label, val, unit, color }) => (
                <div key={label} className="text-center rounded-xl py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-2xl font-bold" style={{ color }}>{val}</p>
                  <p className="text-zinc-600 text-xs">{unit}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* No meals yet for this plan */}
          {meals.length === 0 && (
            <div className="rounded-2xl p-8 text-center" style={{ background: '#111', border: '1px dashed rgba(201,168,76,0.15)' }}>
              <p className="text-zinc-600 text-sm mb-4">No meals in this plan yet</p>
              <button
                onClick={addDefaultMeals}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
                style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}
              >
                Add Breakfast, Lunch, Dinner & Snacks
              </button>
            </div>
          )}

          {/* Meal sections */}
          {meals.map(meal => {
            const mealFoods = foods[meal.id] || []
            const mealCal = Math.round(mealFoods.reduce((s, f) => s + f.calories, 0))
            const mealPro = round1(mealFoods.reduce((s, f) => s + f.protein_g, 0))
            const mealCarb = round1(mealFoods.reduce((s, f) => s + f.carbs_g, 0))
            const mealFat = round1(mealFoods.reduce((s, f) => s + f.fat_g, 0))
            const isOpen = addingFoodTo === meal.id

            return (
              <div key={meal.id} className="rounded-2xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: mealFoods.length > 0 || isOpen ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-semibold text-white text-sm shrink-0">{meal.name}</span>
                    {mealFoods.length > 0 && (
                      <span className="text-zinc-600 text-xs truncate">
                        {mealCal} kcal · {mealPro}g P · {mealCarb}g C · {mealFat}g F
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button
                      onClick={() => isOpen ? closeSearch() : openSearch(meal.id)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                      style={isOpen
                        ? { background: 'rgba(255,255,255,0.05)', color: '#666' }
                        : { background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }
                      }
                    >
                      {isOpen ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      {isOpen ? 'Cancel' : 'Add food'}
                    </button>
                    <button onClick={() => deleteMeal(meal.id)} className="text-zinc-700 hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {mealFoods.map(food => (
                  <div key={food.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
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
                    <button onClick={() => deleteFood(meal.id, food.id)} className="text-zinc-700 hover:text-red-400 transition-colors shrink-0 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {isOpen && (
                  <div className="p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                      <Input
                        value={searchQuery}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search foods & brands… e.g. Thomas everything bagel"
                        className="pl-8 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 text-sm"
                        autoFocus
                      />
                      {searching && <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 animate-spin" />}
                    </div>

                    {searchResults.length > 0 && !selectedFood && (
                      <div className="rounded-xl overflow-hidden max-h-72 overflow-y-auto" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                        {searchResults.map(r => {
                          const calPerServing = r.servingSize ? calcMacro(r.cal100, r.servingSize) : null
                          const proPerServing = r.servingSize ? calcMacro(r.pro100, r.servingSize) : null
                          const carbPerServing = r.servingSize ? calcMacro(r.carb100, r.servingSize) : null
                          const fatPerServing = r.servingSize ? calcMacro(r.fat100, r.servingSize) : null
                          return (
                            <button
                              key={r.id}
                              onClick={() => { setSelectedFood(r); setUseServings(!!r.servingSize); setQuantity(r.servingSize ? '1' : '100') }}
                              className="w-full flex items-start justify-between px-3 py-3 hover:bg-zinc-800 transition-colors text-left gap-3"
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-zinc-200 text-sm font-medium truncate">{r.name}</p>
                                {r.brand && <p className="text-zinc-500 text-xs truncate">{r.brand}</p>}
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                  {calPerServing !== null && r.servingUnit && (
                                    <span className="text-xs" style={{ color: '#C9A84C' }}>
                                      {calPerServing} kcal · {proPerServing}g P · {carbPerServing}g C · {fatPerServing}g F
                                      <span className="text-zinc-600 ml-1">per {r.servingUnit}</span>
                                    </span>
                                  )}
                                  <span className="text-zinc-600 text-xs">
                                    {r.cal100} kcal · {r.pro100}g P · {r.carb100}g C · {r.fat100}g F
                                    <span className="ml-1">per 100g</span>
                                  </span>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {searchQuery && !searching && searchResults.length === 0 && !selectedFood && (
                      <p className="text-zinc-600 text-xs text-center py-2">No results. Try different search terms.</p>
                    )}

                    {selectedFood && (
                      <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-white text-sm font-medium">{selectedFood.name}</p>
                            {selectedFood.brand && <p className="text-zinc-500 text-xs">{selectedFood.brand}</p>}
                            <p className="text-zinc-600 text-xs mt-0.5">{selectedFood.cal100} kcal · {selectedFood.pro100}g P · {selectedFood.carb100}g C · {selectedFood.fat100}g F per 100g</p>
                          </div>
                          <button onClick={() => { setSelectedFood(null); setQuantity('100'); setUseServings(false) }} className="text-zinc-600 hover:text-zinc-400 shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Grams / Servings toggle */}
                        {selectedFood.servingSize && (
                          <div className="flex gap-1 p-0.5 rounded-lg w-fit" style={{ background: 'rgba(0,0,0,0.3)' }}>
                            <button
                              onClick={() => { setUseServings(false); setQuantity('100') }}
                              className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                              style={!useServings ? { background: 'rgba(201,168,76,0.2)', color: '#C9A84C' } : { color: '#666' }}
                            >
                              Grams
                            </button>
                            <button
                              onClick={() => { setUseServings(true); setQuantity('1') }}
                              className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                              style={useServings ? { background: 'rgba(201,168,76,0.2)', color: '#C9A84C' } : { color: '#666' }}
                            >
                              Servings {selectedFood.servingUnit ? `(${selectedFood.servingUnit})` : ''}
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={quantity}
                              onChange={e => setQuantity(e.target.value)}
                              className="w-20 bg-zinc-900 border-zinc-700 text-white text-sm h-8"
                              min="0.1"
                              step={useServings ? '0.5' : '1'}
                            />
                            <span className="text-zinc-500 text-sm">
                              {useServings ? 'servings' : 'grams'}
                            </span>
                            {useServings && selectedFood.servingSize && (
                              <span className="text-zinc-600 text-xs">= {Math.round(qtyGrams)}g</span>
                            )}
                          </div>
                          {preview && (
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-white font-bold">{preview.cal} kcal</span>
                              <span className="text-blue-400">{preview.pro}g P</span>
                              <span className="text-green-400">{preview.carb}g C</span>
                              <span className="text-red-400">{preview.fat}g F</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={addFoodToMeal}
                          disabled={saving}
                          className="w-full py-2 rounded-lg text-sm font-semibold text-black disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}
                        >
                          {saving ? 'Adding…' : `Add to ${meal.name}`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Add custom meal */}
          {meals.length > 0 && (
            <div>
              {addingCustomMeal ? (
                <div className="flex gap-2">
                  <Input
                    value={customMealName}
                    onChange={e => setCustomMealName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addCustomMeal(); if (e.key === 'Escape') setAddingCustomMeal(false) }}
                    placeholder="Meal name (e.g. Pre-workout, Evening snack)"
                    className="bg-zinc-900 border-zinc-800 text-white text-sm"
                    autoFocus
                  />
                  <button onClick={addCustomMeal} className="px-3 py-2 rounded-lg text-xs font-semibold text-black shrink-0" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>Add</button>
                  <button onClick={() => setAddingCustomMeal(false)} className="px-3 py-2 rounded-lg text-xs text-zinc-500 bg-zinc-900 shrink-0">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCustomMeal(true)}
                  className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add custom meal
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
