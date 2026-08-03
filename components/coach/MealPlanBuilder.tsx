'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, Search, X, Loader2, UtensilsCrossed } from 'lucide-react'

interface MealPlanMeal {
  id: string
  client_id: string
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
  unit: string
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
}

interface Props {
  clientId: string
}

const DEFAULT_MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

function round1(n: number) { return Math.round(n * 10) / 10 }
function calcMacro(per100: number, qty: number) { return round1((per100 * qty) / 100) }

async function searchFoods(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  await Promise.allSettled([
    // Open Food Facts — best for branded/packaged foods
    fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=15&fields=code,product_name,brands,nutriments`)
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
          })
        }
      }),

    // USDA — good for whole foods, meats, generics
    fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=DEMO_KEY&pageSize=10&dataType=Branded,Foundation,SR%20Legacy`)
      .then(r => r.json())
      .then(data => {
        for (const f of (data.foods || [])) {
          const get = (id: number) => (f.foodNutrients || []).find((n: { nutrientId: number; value: number }) => n.nutrientId === id)?.value ?? 0
          const cal = get(1008)
          if (!cal) continue
          results.push({
            id: `usda-${f.fdcId}`,
            name: f.description,
            brand: f.brandOwner || f.brandName || null,
            cal100: Math.round(cal),
            pro100: get(1003),
            carb100: get(1005),
            fat100: get(1004),
          })
        }
      }),
  ])

  return results.slice(0, 25)
}

export default function MealPlanBuilder({ clientId }: Props) {
  const [meals, setMeals] = useState<MealPlanMeal[]>([])
  const [foods, setFoods] = useState<Record<string, MealPlanFood[]>>({})
  const [addingFoodTo, setAddingFoodTo] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<SearchResult | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [saving, setSaving] = useState(false)
  const [customMealName, setCustomMealName] = useState('')
  const [addingCustomMeal, setAddingCustomMeal] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const supabase = createClient()

  useEffect(() => { load() }, [clientId])

  async function load() {
    const { data: mealData } = await supabase
      .from('meal_plan_meals').select('*').eq('client_id', clientId).order('display_order')
    if (!mealData || mealData.length === 0) return
    setMeals(mealData)
    const { data: foodData } = await supabase
      .from('meal_plan_foods').select('*').eq('client_id', clientId).order('display_order')
    if (!foodData) return
    const grouped: Record<string, MealPlanFood[]> = {}
    for (const f of foodData) {
      if (!grouped[f.meal_id]) grouped[f.meal_id] = []
      grouped[f.meal_id].push(f)
    }
    setFoods(grouped)
  }

  async function addDefaultMeals() {
    const rows = DEFAULT_MEALS.map((name, i) => ({ client_id: clientId, name, display_order: i }))
    const { data, error } = await supabase.from('meal_plan_meals').insert(rows).select()
    if (error || !data) { toast.error('Failed to create meals'); return }
    setMeals(data)
  }

  async function addCustomMeal() {
    if (!customMealName.trim()) return
    const { data, error } = await supabase.from('meal_plan_meals').insert({
      client_id: clientId, name: customMealName.trim(), display_order: meals.length,
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
  }

  function closeSearch() {
    setAddingFoodTo(null)
    setSearchQuery('')
    setSearchResults([])
    setSelectedFood(null)
    setQuantity('100')
  }

  async function addFoodToMeal() {
    if (!selectedFood || !addingFoodTo) return
    const qty = parseFloat(quantity) || 100
    setSaving(true)
    const mealFoods = foods[addingFoodTo] || []
    const { data, error } = await supabase.from('meal_plan_foods').insert({
      meal_id: addingFoodTo,
      client_id: clientId,
      food_name: selectedFood.name,
      brand_name: selectedFood.brand,
      quantity: qty,
      unit: 'g',
      calories: calcMacro(selectedFood.cal100, qty),
      protein_g: calcMacro(selectedFood.pro100, qty),
      carbs_g: calcMacro(selectedFood.carb100, qty),
      fat_g: calcMacro(selectedFood.fat100, qty),
      calories_per_100g: selectedFood.cal100,
      protein_per_100g: selectedFood.pro100,
      carbs_per_100g: selectedFood.carb100,
      fat_per_100g: selectedFood.fat100,
      display_order: mealFoods.length,
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

  const qty = parseFloat(quantity) || 100
  const preview = selectedFood ? {
    cal: calcMacro(selectedFood.cal100, qty),
    pro: calcMacro(selectedFood.pro100, qty),
    carb: calcMacro(selectedFood.carb100, qty),
    fat: calcMacro(selectedFood.fat100, qty),
  } : null

  if (meals.length === 0) {
    return (
      <div className="rounded-2xl p-12 text-center" style={{ background: '#111', border: '1px dashed rgba(201,168,76,0.2)' }}>
        <UtensilsCrossed className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
        <p className="text-zinc-400 text-sm font-medium mb-1">No meal plan yet</p>
        <p className="text-zinc-600 text-xs mb-6">Set up meals to start building</p>
        <button
          onClick={addDefaultMeals}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}
        >
          Add Breakfast, Lunch, Dinner & Snacks
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Daily total */}
      <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)' }}>
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Daily Total</p>
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

            {/* Food rows */}
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

            {/* Search panel */}
            {isOpen && (
              <div className="p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <Input
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Search foods & brands… e.g. Thomas everything bagel, 90/10 beef"
                    className="pl-8 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 text-sm"
                    autoFocus
                  />
                  {searching && <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 animate-spin" />}
                </div>

                {/* Results list */}
                {searchResults.length > 0 && !selectedFood && (
                  <div className="rounded-xl overflow-hidden max-h-56 overflow-y-auto" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                    {searchResults.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedFood(r)}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800 transition-colors text-left"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-zinc-200 text-sm truncate">{r.name}</p>
                          {r.brand && <p className="text-zinc-600 text-xs truncate">{r.brand}</p>}
                        </div>
                        <span className="text-zinc-500 text-xs shrink-0 ml-3">{r.cal100} kcal/100g</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery && !searching && searchResults.length === 0 && !selectedFood && (
                  <p className="text-zinc-600 text-xs text-center py-2">No results. Try different search terms.</p>
                )}

                {/* Selected food + quantity */}
                {selectedFood && (
                  <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium">{selectedFood.name}</p>
                        {selectedFood.brand && <p className="text-zinc-500 text-xs">{selectedFood.brand}</p>}
                        <p className="text-zinc-600 text-xs mt-0.5">{selectedFood.cal100} kcal · {selectedFood.pro100}g P · {selectedFood.carb100}g C · {selectedFood.fat100}g F per 100g</p>
                      </div>
                      <button onClick={() => { setSelectedFood(null); setQuantity('100') }} className="text-zinc-600 hover:text-zinc-400 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={quantity}
                          onChange={e => setQuantity(e.target.value)}
                          className="w-20 bg-zinc-900 border-zinc-700 text-white text-sm h-8"
                          min="1"
                        />
                        <span className="text-zinc-500 text-sm">grams</span>
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
                      className="w-full py-2 rounded-lg text-sm font-semibold text-black disabled:opacity-50 transition-opacity"
                      style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}
                    >
                      {saving ? 'Adding…' : `Add ${qty}g to ${meal.name}`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Add custom meal */}
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
    </div>
  )
}
