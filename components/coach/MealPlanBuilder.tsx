'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, Search, X, Loader2, UtensilsCrossed, BookMarked, Pencil, Check, Settings2 } from 'lucide-react'

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
  display_qty: number | null
  display_unit: string | null
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

interface CustomFood {
  id: string
  coach_id: string
  name: string
  brand_name: string | null
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  serving_size_g: number | null
  serving_unit: string | null
}

interface ManualEntry {
  name: string
  brand: string
  mode: 'grams' | 'servings'
  forGrams: string      // grams mode: gram amount from the label
  servingCount: string  // servings mode: how many servings the macros below are for (e.g. "2")
  servingUnit: string   // label name e.g. "rice cake", "1 tub"
  cal: string
  pro: string
  carb: string
  fat: string
}

const EMPTY_MANUAL: ManualEntry = { name: '', brand: '', mode: 'grams', forGrams: '', servingCount: '', servingUnit: '', cal: '', pro: '', carb: '', fat: '' }

interface Props {
  clientId: string
  coachId: string
}

const DEFAULT_MEALS = ['Meal 1', 'Meal 2', 'Meal 3', 'Meal 4']

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

export default function MealPlanBuilder({ clientId, coachId }: Props) {
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
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([])
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual] = useState<ManualEntry>(EMPTY_MANUAL)
  const [savingCustom, setSavingCustom] = useState(false)
  const [editingCustomFood, setEditingCustomFood] = useState<CustomFood | null>(null)
  const [editCustomForm, setEditCustomForm] = useState({ name: '', brand: '', cal: '', pro: '', carb: '', fat: '', servingG: '', servingUnit: '' })
  const [savingCustomEdit, setSavingCustomEdit] = useState(false)
  const [editingFood, setEditingFood] = useState<{ id: string, mealId: string, qty: string, displayQty: string, displayUnit: string } | null>(null)
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editingMealName, setEditingMealName] = useState('')
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editingPlanName, setEditingPlanName] = useState('')
  const [dragOverMealId, setDragOverMealId] = useState<string | null>(null)
  const dragFoodRef = useRef<{ food: MealPlanFood, fromMealId: string } | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const supabase = createClient()

  useEffect(() => { loadPlans(); loadCustomFoods() }, [clientId])
  useEffect(() => { if (selectedPlanId) loadMeals(selectedPlanId) }, [selectedPlanId])

  async function loadCustomFoods() {
    const { data } = await supabase.from('custom_foods').select('*').eq('coach_id', coachId).order('name')
    if (data) setCustomFoods(data)
  }

  async function deleteCustomFood(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Remove this food from your library?')) return
    await supabase.from('custom_foods').delete().eq('id', id)
    setCustomFoods(prev => prev.filter(f => f.id !== id))
    toast.success('Removed from library')
  }

  function openCustomFoodEdit(food: CustomFood, e: React.MouseEvent) {
    e.stopPropagation()
    // Reverse-calculate: per-100g → for serving_size_g
    const g = food.serving_size_g ?? 100
    const factor = g / 100
    setEditCustomForm({
      name: food.name,
      brand: food.brand_name || '',
      cal: String(round1(food.calories_per_100g * factor)),
      pro: String(round1(food.protein_per_100g * factor)),
      carb: String(round1(food.carbs_per_100g * factor)),
      fat: String(round1(food.fat_per_100g * factor)),
      servingG: String(g),
      servingUnit: food.serving_unit || '',
    })
    setEditingCustomFood(food)
  }

  async function saveCustomFoodEdit() {
    if (!editingCustomFood) return
    if (!editCustomForm.name.trim()) { toast.error('Food name is required'); return }
    const grams = parseFloat(editCustomForm.servingG) || 100
    const factor = 100 / grams
    setSavingCustomEdit(true)
    const update = {
      name: editCustomForm.name.trim(),
      brand_name: editCustomForm.brand.trim() || null,
      calories_per_100g: round1((parseFloat(editCustomForm.cal) || 0) * factor),
      protein_per_100g:  round1((parseFloat(editCustomForm.pro) || 0) * factor),
      carbs_per_100g:    round1((parseFloat(editCustomForm.carb) || 0) * factor),
      fat_per_100g:      round1((parseFloat(editCustomForm.fat) || 0) * factor),
      serving_size_g:    grams,
      serving_unit:      editCustomForm.servingUnit.trim() || `${grams}g serving`,
    }
    const { data, error } = await supabase.from('custom_foods').update(update).eq('id', editingCustomFood.id).select().single()
    setSavingCustomEdit(false)
    if (error || !data) { toast.error('Failed to update'); return }
    setCustomFoods(prev => prev.map(f => f.id === data.id ? data : f).sort((a, b) => a.name.localeCompare(b.name)))
    setEditingCustomFood(null)
    toast.success(`"${data.name}" updated`)
  }

  async function saveCustomFood() {
    if (!manual.name.trim()) { toast.error('Food name is required'); return }
    if (!manual.cal) { toast.error('Calories are required'); return }

    let calories_per_100g: number, protein_per_100g: number, carbs_per_100g: number, fat_per_100g: number
    let serving_size_g: number | null, serving_unit: string

    if (manual.mode === 'grams') {
      const grams = parseFloat(manual.forGrams)
      if (!grams || grams <= 0) { toast.error('Enter the gram amount from the label'); return }
      const factor = 100 / grams
      calories_per_100g = round1((parseFloat(manual.cal) || 0) * factor)
      protein_per_100g  = round1((parseFloat(manual.pro)  || 0) * factor)
      carbs_per_100g    = round1((parseFloat(manual.carb) || 0) * factor)
      fat_per_100g      = round1((parseFloat(manual.fat)  || 0) * factor)
      serving_size_g    = grams
      serving_unit      = manual.servingUnit.trim() || `${grams}g serving`
    } else {
      // Servings mode: store per-1-serving macros in per-100g columns, serving_size_g=100
      // so qty×100/100 = qty×(per-serving) — scales correctly for 1,2,3 servings
      const count = parseFloat(manual.servingCount) || 1
      if (!manual.servingUnit.trim()) { toast.error('Enter a serving label (e.g. rice cake)'); return }
      calories_per_100g = round1((parseFloat(manual.cal) || 0) / count)
      protein_per_100g  = round1((parseFloat(manual.pro)  || 0) / count)
      carbs_per_100g    = round1((parseFloat(manual.carb) || 0) / count)
      fat_per_100g      = round1((parseFloat(manual.fat)  || 0) / count)
      serving_size_g    = 100  // sentinel: 1 serving = 100 "units", so scaling math works
      serving_unit      = manual.servingUnit.trim()
    }

    setSavingCustom(true)
    const row = {
      coach_id: coachId,
      name: manual.name.trim(),
      brand_name: manual.brand.trim() || null,
      calories_per_100g,
      protein_per_100g,
      carbs_per_100g,
      fat_per_100g,
      serving_size_g,
      serving_unit,
    }
    const { data, error } = await supabase.from('custom_foods').insert(row).select().single()
    setSavingCustom(false)
    if (error || !data) { toast.error('Failed to save'); return }
    setCustomFoods(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    // Auto-select the new custom food
    const result: SearchResult = {
      id: `custom-${data.id}`,
      name: data.name,
      brand: data.brand_name,
      cal100: data.calories_per_100g,
      pro100: data.protein_per_100g,
      carb100: data.carbs_per_100g,
      fat100: data.fat_per_100g,
      servingSize: data.serving_size_g,
      servingUnit: data.serving_unit,
    }
    setSelectedFood(result)
    setUseServings(!!data.serving_size_g)
    setQuantity(data.serving_size_g ? '1' : '100')
    setShowManual(false)
    setManual(EMPTY_MANUAL)
    toast.success(`"${data.name}" saved to your food library`)
  }


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
    setShowManual(false)
    setManual(EMPTY_MANUAL)
  }

  function closeSearch() {
    setAddingFoodTo(null)
    setSearchQuery('')
    setSearchResults([])
    setSelectedFood(null)
    setQuantity('100')
    setUseServings(false)
    setShowManual(false)
    setManual(EMPTY_MANUAL)
  }

  // Custom foods matching search query
  function matchingCustomFoods(q: string): SearchResult[] {
    if (!q.trim()) return customFoods.slice(0, 5).map(toSearchResult)
    const lower = q.toLowerCase()
    return customFoods
      .filter(f => f.name.toLowerCase().includes(lower) || (f.brand_name || '').toLowerCase().includes(lower))
      .map(toSearchResult)
  }

  function toSearchResult(f: CustomFood): SearchResult {
    return {
      id: `custom-${f.id}`,
      name: f.name,
      brand: f.brand_name,
      cal100: f.calories_per_100g,
      pro100: f.protein_per_100g,
      carb100: f.carbs_per_100g,
      fat100: f.fat_per_100g,
      servingSize: f.serving_size_g,
      servingUnit: f.serving_unit,
    }
  }

  async function addFoodToMeal() {
    if (!selectedFood || !addingFoodTo) return
    const enteredQty = parseFloat(quantity) || 1
    const grams = useServings && selectedFood.servingSize
      ? enteredQty * selectedFood.servingSize
      : enteredQty
    setSaving(true)
    const { data, error } = await supabase.from('meal_plan_foods').insert({
      meal_id: addingFoodTo,
      client_id: clientId,
      food_name: selectedFood.name,
      brand_name: selectedFood.brand,
      quantity: Math.round(grams),
      unit: 'g',
      // Human-readable label: "2 eggs" vs "150 g"
      display_qty: useServings && selectedFood.servingUnit ? enteredQty : null,
      display_unit: useServings && selectedFood.servingUnit ? selectedFood.servingUnit : null,
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
    const newFoods = { ...foods, [addingFoodTo]: [...(foods[addingFoodTo] || []), data] }
    setFoods(newFoods)
    syncMacrosToTarget(newFoods)
    setSelectedFood(null)
    setSearchQuery('')
    setSearchResults([])
    setQuantity('100')
    toast.success(`${selectedFood.name} added`)
  }

  async function deleteFood(mealId: string, foodId: string) {
    await supabase.from('meal_plan_foods').delete().eq('id', foodId)
    const newFoods = { ...foods, [mealId]: foods[mealId].filter(f => f.id !== foodId) }
    setFoods(newFoods)
    syncMacrosToTarget(newFoods)
  }

  async function updateFoodQty(food: MealPlanFood, mealId: string, newQty: string, displayQty: string, displayUnit: string) {
    const grams = parseFloat(newQty)
    if (!grams || grams <= 0 || !food.calories_per_100g) { setEditingFood(null); return }
    const dQty = displayQty.trim() ? parseFloat(displayQty) : null
    const dUnit = displayUnit.trim() || null
    const update = {
      quantity: Math.round(grams),
      calories: calcMacro(food.calories_per_100g, grams),
      protein_g: calcMacro(food.protein_per_100g ?? 0, grams),
      carbs_g: calcMacro(food.carbs_per_100g ?? 0, grams),
      fat_g: calcMacro(food.fat_per_100g ?? 0, grams),
      display_qty: dQty,
      display_unit: dUnit,
    }
    await supabase.from('meal_plan_foods').update(update).eq('id', food.id)
    const newFoods = { ...foods, [mealId]: foods[mealId].map(f => f.id === food.id ? { ...f, ...update } : f) }
    setFoods(newFoods)
    syncMacrosToTarget(newFoods)
    setEditingFood(null)
  }

  async function renameMeal(mealId: string, name: string) {
    const trimmed = name.trim()
    setEditingMealId(null)
    if (!trimmed) return
    await supabase.from('meal_plan_meals').update({ name: trimmed }).eq('id', mealId)
    setMeals(prev => prev.map(m => m.id === mealId ? { ...m, name: trimmed } : m))
  }

  async function renamePlan(planId: string, name: string) {
    const trimmed = name.trim()
    setEditingPlanId(null)
    if (!trimmed) return
    await supabase.from('meal_plan_plans').update({ name: trimmed }).eq('id', planId)
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, name: trimmed } : p))
  }

  async function dropFoodOnMeal(toMealId: string) {
    const drag = dragFoodRef.current
    setDragOverMealId(null)
    dragFoodRef.current = null
    if (!drag || drag.fromMealId === toMealId) return
    const { food, fromMealId } = drag
    const newOrder = (foods[toMealId] || []).length
    await supabase.from('meal_plan_foods').update({ meal_id: toMealId, display_order: newOrder }).eq('id', food.id)
    const newFoods = {
      ...foods,
      [fromMealId]: foods[fromMealId].filter(f => f.id !== food.id),
      [toMealId]: [...(foods[toMealId] || []), { ...food, meal_id: toMealId }],
    }
    setFoods(newFoods)
    syncMacrosToTarget(newFoods)
    toast.success(`Moved to ${meals.find(m => m.id === toMealId)?.name}`)
  }

  async function syncMacrosToTarget(newFoods: Record<string, MealPlanFood[]>) {
    const all = Object.values(newFoods).flat()
    const cal = Math.round(all.reduce((s, f) => s + f.calories, 0))
    const pro = round1(all.reduce((s, f) => s + f.protein_g, 0))
    const carb = round1(all.reduce((s, f) => s + f.carbs_g, 0))
    const fat = round1(all.reduce((s, f) => s + f.fat_g, 0))
    // Fetch first macro_targets plan to upsert into
    const { data: targets } = await supabase.from('macro_targets').select('id').eq('client_id', clientId).order('created_at').limit(1)
    if (targets && targets.length > 0) {
      await supabase.from('macro_targets').update({
        protein_g: pro, carbs_g: carb, fat_g: fat, calories_override: cal, updated_at: new Date().toISOString(),
      }).eq('id', targets[0].id)
    } else {
      await supabase.from('macro_targets').insert({
        client_id: clientId, coach_id: coachId, name: 'Meal Plan', protein_g: pro, carbs_g: carb, fat_g: fat, calories_override: cal,
      })
    }
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
            {editingPlanId === plan.id ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editingPlanName}
                  onChange={e => setEditingPlanName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') renamePlan(plan.id, editingPlanName); if (e.key === 'Escape') setEditingPlanId(null) }}
                  className="bg-zinc-900 border-zinc-700 text-white text-sm h-8 w-36"
                  autoFocus
                />
                <button onClick={() => renamePlan(plan.id, editingPlanName)} className="text-zinc-400 hover:text-white p-1"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditingPlanId(null)} className="text-zinc-600 hover:text-zinc-400 p-1"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button
                onClick={() => setSelectedPlanId(plan.id)}
                onDoubleClick={() => { setEditingPlanId(plan.id); setEditingPlanName(plan.name) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={selectedPlanId === plan.id
                  ? { background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#000' }
                  : { background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: '#888' }
                }
                title="Double-click to rename"
              >
                {plan.name}
              </button>
            )}
            {selectedPlanId === plan.id && plans.length > 1 && editingPlanId !== plan.id && (
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
              <div
                key={meal.id}
                className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: '#111',
                  border: dragOverMealId === meal.id ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.07)',
                }}
                onDragOver={e => { e.preventDefault(); setDragOverMealId(meal.id) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverMealId(null) }}
                onDrop={() => dropFoodOnMeal(meal.id)}
              >
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: mealFoods.length > 0 || isOpen ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    {editingMealId === meal.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editingMealName}
                          onChange={e => setEditingMealName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameMeal(meal.id, editingMealName); if (e.key === 'Escape') setEditingMealId(null) }}
                          className="bg-zinc-800 border-zinc-700 text-white text-sm h-7 w-36"
                          autoFocus
                        />
                        <button onClick={() => renameMeal(meal.id, editingMealName)} className="text-zinc-400 hover:text-white p-0.5"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingMealId(null)} className="text-zinc-600 hover:text-zinc-400 p-0.5"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <button
                        className="font-semibold text-white text-sm shrink-0 flex items-center gap-1.5 hover:text-zinc-300 transition-colors group"
                        onClick={() => { setEditingMealId(meal.id); setEditingMealName(meal.name) }}
                        title="Click to rename"
                      >
                        {meal.name}
                        <Pencil className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                      </button>
                    )}
                    {mealFoods.length > 0 && editingMealId !== meal.id && (
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

                {mealFoods.map(food => {
                  const isEditingThisFood = editingFood?.id === food.id
                  return (
                    <div
                      key={food.id}
                      draggable={!isEditingThisFood && meals.length > 1}
                      onDragStart={() => { dragFoodRef.current = { food, fromMealId: meal.id } }}
                      onDragEnd={() => { dragFoodRef.current = null; setDragOverMealId(null) }}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: meals.length > 1 ? 'grab' : 'default' }}
                    >
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-zinc-200 text-sm font-medium truncate">{food.food_name}</p>
                          {isEditingThisFood ? (
                            <div className="mt-1 space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  value={editingFood.qty}
                                  onChange={e => setEditingFood(f => f ? { ...f, qty: e.target.value } : f)}
                                  onKeyDown={e => { if (e.key === 'Escape') setEditingFood(null) }}
                                  className="w-20 bg-zinc-800 border-zinc-700 text-white text-xs h-7"
                                  autoFocus
                                  min="1"
                                />
                                <span className="text-zinc-600 text-xs">g</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-600 text-xs w-14 shrink-0">Display as</span>
                                <Input
                                  type="number"
                                  value={editingFood.displayQty}
                                  onChange={e => setEditingFood(f => f ? { ...f, displayQty: e.target.value } : f)}
                                  placeholder="2"
                                  className="w-12 bg-zinc-800 border-zinc-700 text-white text-xs h-7"
                                  min="0"
                                />
                                <Input
                                  type="text"
                                  value={editingFood.displayUnit}
                                  onChange={e => setEditingFood(f => f ? { ...f, displayUnit: e.target.value } : f)}
                                  onKeyDown={e => { if (e.key === 'Enter') updateFoodQty(food, meal.id, editingFood.qty, editingFood.displayQty, editingFood.displayUnit); if (e.key === 'Escape') setEditingFood(null) }}
                                  placeholder="eggs"
                                  className="w-20 bg-zinc-800 border-zinc-700 text-white text-xs h-7"
                                />
                                <button onClick={() => updateFoodQty(food, meal.id, editingFood.qty, editingFood.displayQty, editingFood.displayUnit)} className="text-zinc-400 hover:text-white p-0.5"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditingFood(null)} className="text-zinc-600 hover:text-zinc-400 p-0.5"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors group mt-0.5"
                              onClick={() => setEditingFood({ id: food.id, mealId: meal.id, qty: String(food.quantity), displayQty: food.display_qty != null ? String(food.display_qty) : '', displayUnit: food.display_unit ?? '' })}
                              title="Click to edit quantity"
                            >
                              {food.brand_name && <span className="text-zinc-500 text-xs">{food.brand_name} · </span>}
                              <span className="text-zinc-200 text-sm font-semibold">
                                {food.display_qty != null && food.display_unit
                                  ? `${food.display_qty} ${food.display_unit}`
                                  : `${food.quantity}g`}
                              </span>
                              <Pencil className="w-2.5 h-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </div>
                        {!isEditingThisFood && (
                          <div className="flex items-center gap-3 text-xs shrink-0">
                            <span className="text-zinc-300 font-semibold">{food.calories} kcal</span>
                            <span className="text-blue-400">{food.protein_g}g P</span>
                            <span className="text-green-400">{food.carbs_g}g C</span>
                            <span className="text-red-400">{food.fat_g}g F</span>
                          </div>
                        )}
                        {!isEditingThisFood && (
                          <button onClick={() => deleteFood(meal.id, food.id)} className="text-zinc-700 hover:text-red-400 transition-colors p-1 shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

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

                    {/* Results list */}
                    {!selectedFood && !showManual && (() => {
                      const custom = matchingCustomFoods(searchQuery)
                      const allResults = [
                        ...custom.map(r => ({ ...r, isCustom: true })),
                        ...searchResults.filter(r => !custom.find(c => c.name === r.name)).map(r => ({ ...r, isCustom: false })),
                      ]
                      if (allResults.length === 0 && !searching) return null
                      return (
                        <div className="rounded-xl overflow-hidden max-h-72 overflow-y-auto" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                          {allResults.map(r => {
                            const calPerServing = r.servingSize ? calcMacro(r.cal100, r.servingSize) : null
                            const proPerServing = r.servingSize ? calcMacro(r.pro100, r.servingSize) : null
                            const carbPerServing = r.servingSize ? calcMacro(r.carb100, r.servingSize) : null
                            const fatPerServing = r.servingSize ? calcMacro(r.fat100, r.servingSize) : null
                            return (
                              <div
                                key={r.id}
                                className="w-full flex items-start justify-between px-3 py-3 hover:bg-zinc-800 transition-colors gap-3"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                              >
                                <button
                                  onClick={() => { setSelectedFood(r); setUseServings(!!r.servingSize); setQuantity(r.servingSize ? '1' : '100') }}
                                  className="flex-1 text-left min-w-0"
                                >
                                  <div className="flex items-center gap-2">
                                    <p className="text-zinc-200 text-sm font-medium truncate">{r.name}</p>
                                    {r.isCustom && (
                                      <span className="text-xs px-1.5 py-0.5 rounded shrink-0 font-medium" style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>Saved</span>
                                    )}
                                  </div>
                                  {r.brand && <p className="text-zinc-500 text-xs truncate">{r.brand}</p>}
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                    {calPerServing !== null && r.servingUnit && (
                                      <span className="text-xs" style={{ color: '#C9A84C' }}>
                                        {calPerServing} kcal · {proPerServing}g P · {carbPerServing}g C · {fatPerServing}g F
                                        <span className="text-zinc-600 ml-1">per {r.servingUnit}</span>
                                      </span>
                                    )}
                                    <span className="text-zinc-600 text-xs">
                                      {r.cal100} kcal · {r.pro100}g P · {r.carb100}g C · {r.fat100}g F per 100g
                                    </span>
                                  </div>
                                </button>
                                {r.isCustom && (
                                  <div className="flex flex-col gap-1 shrink-0">
                                    <button
                                      onClick={e => openCustomFoodEdit(customFoods.find(f => f.id === r.id.replace('custom-', ''))!, e)}
                                      className="text-zinc-600 hover:text-zinc-300 transition-colors"
                                      title="Edit food"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={e => deleteCustomFood(r.id.replace('custom-', ''), e)}
                                      className="text-zinc-700 hover:text-red-400 transition-colors"
                                      title="Remove from library"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}

                    {searchQuery && !searching && searchResults.length === 0 && matchingCustomFoods(searchQuery).length === 0 && !selectedFood && !showManual && (
                      <p className="text-zinc-600 text-xs text-center py-2">No results found.</p>
                    )}

                    {/* Edit custom food form */}
                    {editingCustomFood && !selectedFood && !showManual && (
                      <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.2)' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Settings2 className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
                            <p className="text-white text-xs font-semibold uppercase tracking-wider">Edit saved food</p>
                          </div>
                          <button onClick={() => setEditingCustomFood(null)} className="text-zinc-600 hover:text-zinc-400"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="space-y-2">
                          <Input value={editCustomForm.name} onChange={e => setEditCustomForm(f => ({ ...f, name: e.target.value }))} placeholder="Food name *" className="bg-zinc-900 border-zinc-800 text-white text-xs h-8" />
                          <Input value={editCustomForm.brand} onChange={e => setEditCustomForm(f => ({ ...f, brand: e.target.value }))} placeholder="Brand (optional)" className="bg-zinc-900 border-zinc-800 text-white text-xs h-8" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Input type="number" value={editCustomForm.servingG} onChange={e => setEditCustomForm(f => ({ ...f, servingG: e.target.value }))} placeholder="Grams" className="w-20 bg-zinc-900 border-zinc-800 text-white text-xs h-8" />
                          <span className="text-zinc-500 text-xs">g</span>
                          <Input value={editCustomForm.servingUnit} onChange={e => setEditCustomForm(f => ({ ...f, servingUnit: e.target.value }))} placeholder='Label, e.g. "1 tub"' className="flex-1 bg-zinc-900 border-zinc-800 text-white text-xs h-8" />
                        </div>
                        <p className="text-zinc-500 text-xs font-medium">Macros for {editCustomForm.servingG || '?'}g:</p>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: 'Calories', key: 'cal' as const },
                            { label: 'Protein (g)', key: 'pro' as const },
                            { label: 'Carbs (g)', key: 'carb' as const },
                            { label: 'Fat (g)', key: 'fat' as const },
                          ].map(({ label, key }) => (
                            <div key={key}>
                              <p className="text-zinc-600 text-xs mb-1">{label}</p>
                              <Input type="number" value={editCustomForm[key]} onChange={e => setEditCustomForm(f => ({ ...f, [key]: e.target.value }))} placeholder="0" className="bg-zinc-900 border-zinc-800 text-white text-xs h-8" />
                            </div>
                          ))}
                        </div>
                        <button onClick={saveCustomFoodEdit} disabled={savingCustomEdit}
                          className="w-full py-2 rounded-lg text-sm font-semibold text-black disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
                          {savingCustomEdit ? 'Saving…' : 'Save changes'}
                        </button>
                      </div>
                    )}

                    {/* Enter manually button */}
                    {!selectedFood && !showManual && !editingCustomFood && (
                      <button
                        onClick={() => setShowManual(true)}
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <BookMarked className="w-3.5 h-3.5" /> Enter food manually & save to library
                      </button>
                    )}

                    {/* Manual entry form */}
                    {showManual && !selectedFood && !editingCustomFood && (
                      <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex items-center justify-between">
                          <p className="text-white text-xs font-semibold uppercase tracking-wider">Enter food manually</p>
                          <button onClick={() => { setShowManual(false); setManual(EMPTY_MANUAL) }} className="text-zinc-600 hover:text-zinc-400"><X className="w-3.5 h-3.5" /></button>
                        </div>

                        {/* Name + Brand */}
                        <div className="space-y-2">
                          <Input value={manual.name} onChange={e => setManual(p => ({ ...p, name: e.target.value }))} placeholder="Food name *  (e.g. Rice Cake)" className="bg-zinc-900 border-zinc-800 text-white text-xs h-8" />
                          <Input value={manual.brand} onChange={e => setManual(p => ({ ...p, brand: e.target.value }))} placeholder="Brand (optional)" className="bg-zinc-900 border-zinc-800 text-white text-xs h-8" />
                        </div>

                        {/* Mode toggle */}
                        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                          {(['grams', 'servings'] as const).map(m => (
                            <button
                              key={m}
                              onClick={() => setManual(p => ({ ...p, mode: m }))}
                              className="flex-1 py-1.5 text-xs font-medium transition-all"
                              style={manual.mode === m
                                ? { background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#000' }
                                : { background: 'transparent', color: '#666' }
                              }
                            >
                              {m === 'grams' ? 'By grams' : 'By servings'}
                            </button>
                          ))}
                        </div>

                        {/* Mode-specific serving size inputs */}
                        {manual.mode === 'grams' ? (
                          <div>
                            <p className="text-zinc-400 text-xs mb-1.5 font-medium">Serving size on the label</p>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={manual.forGrams}
                                onChange={e => setManual(p => ({ ...p, forGrams: e.target.value }))}
                                placeholder="e.g. 250"
                                className="w-20 bg-zinc-900 border-zinc-800 text-white text-xs h-8"
                              />
                              <span className="text-zinc-500 text-xs">grams</span>
                              <Input
                                value={manual.servingUnit}
                                onChange={e => setManual(p => ({ ...p, servingUnit: e.target.value }))}
                                placeholder='Optional label, e.g. "1 tub"'
                                className="flex-1 bg-zinc-900 border-zinc-800 text-white text-xs h-8"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-zinc-400 text-xs mb-1.5 font-medium">Serving info</p>
                            <div className="flex items-center gap-2">
                              <p className="text-zinc-500 text-xs shrink-0">These macros are for</p>
                              <Input
                                type="number"
                                value={manual.servingCount}
                                onChange={e => setManual(p => ({ ...p, servingCount: e.target.value }))}
                                placeholder="2"
                                className="w-16 bg-zinc-900 border-zinc-800 text-white text-xs h-8"
                              />
                              <Input
                                value={manual.servingUnit}
                                onChange={e => setManual(p => ({ ...p, servingUnit: e.target.value }))}
                                placeholder='e.g. "rice cake"'
                                className="flex-1 bg-zinc-900 border-zinc-800 text-white text-xs h-8"
                              />
                            </div>
                            <p className="text-zinc-600 text-xs mt-1">
                              {manual.servingUnit && manual.servingCount
                                ? `You'll be able to add 1, 2, 3… ${manual.servingUnit}s when building the plan.`
                                : 'You\'ll be able to pick any number of servings when adding to the plan.'}
                            </p>
                          </div>
                        )}

                        {/* Macros */}
                        <div>
                          <p className="text-zinc-400 text-xs mb-1.5 font-medium">
                            {manual.mode === 'grams'
                              ? `Macros for ${manual.forGrams ? `${manual.forGrams}g` : 'that amount'}`
                              : `Macros for ${manual.servingCount || '?'} ${manual.servingUnit || 'serving(s)'}`}
                          </p>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: 'Calories', key: 'cal' as const },
                              { label: 'Protein (g)', key: 'pro' as const },
                              { label: 'Carbs (g)', key: 'carb' as const },
                              { label: 'Fat (g)', key: 'fat' as const },
                            ].map(({ label, key }) => (
                              <div key={key}>
                                <p className="text-zinc-600 text-xs mb-1">{label}</p>
                                <Input
                                  type="number"
                                  value={manual[key]}
                                  onChange={e => setManual(p => ({ ...p, [key]: e.target.value }))}
                                  placeholder="0"
                                  className="bg-zinc-900 border-zinc-800 text-white text-xs h-8"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Live per-serving preview */}
                        {manual.cal && (() => {
                          if (manual.mode === 'grams') {
                            const g = parseFloat(manual.forGrams)
                            if (!g) return null
                            const f = 100 / g
                            return (
                              <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
                                <span className="text-zinc-500">Per 100g: </span>
                                <span className="text-zinc-300">
                                  {round1((parseFloat(manual.cal)||0)*f)} kcal
                                  {manual.pro  ? ` · ${round1((parseFloat(manual.pro) ||0)*f)}g P` : ''}
                                  {manual.carb ? ` · ${round1((parseFloat(manual.carb)||0)*f)}g C` : ''}
                                  {manual.fat  ? ` · ${round1((parseFloat(manual.fat) ||0)*f)}g F` : ''}
                                </span>
                              </div>
                            )
                          } else {
                            const count = parseFloat(manual.servingCount) || 1
                            const perOne = round1((parseFloat(manual.cal)||0) / count)
                            return (
                              <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
                                <span className="text-zinc-500">Per {manual.servingUnit || 'serving'}: </span>
                                <span className="text-zinc-300">
                                  {perOne} kcal
                                  {manual.pro  ? ` · ${round1((parseFloat(manual.pro) ||0)/count)}g P` : ''}
                                  {manual.carb ? ` · ${round1((parseFloat(manual.carb)||0)/count)}g C` : ''}
                                  {manual.fat  ? ` · ${round1((parseFloat(manual.fat) ||0)/count)}g F` : ''}
                                </span>
                              </div>
                            )
                          }
                        })()}

                        <button
                          onClick={saveCustomFood}
                          disabled={savingCustom}
                          className="w-full py-2 rounded-lg text-sm font-semibold text-black disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}
                        >
                          {savingCustom ? 'Saving…' : 'Save to library & add to meal'}
                        </button>
                      </div>
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
