'use client'

import { useState } from 'react'
import { Plan } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import RichTextEditor from '@/components/shared/RichTextEditor'
import { toast } from 'sonner'
import { Save, Utensils, Dumbbell, Pill, Flame } from 'lucide-react'

interface Props {
  clientId: string
  plan: Plan | null
  onSaved: (plan: Plan) => void
}

export default function PlanEditor({ clientId, plan, onSaved }: Props) {
  const [mealPlan, setMealPlan] = useState(plan?.meal_plan || '')
  const [training, setTraining] = useState(plan?.training_split || '')
  const [supplements, setSupplements] = useState(plan?.supplement_protocol || '')
  const [calories, setCalories] = useState(plan?.calories?.toString() || '')
  const [protein, setProtein] = useState(plan?.protein_g?.toString() || '')
  const [carbs, setCarbs] = useState(plan?.carbs_g?.toString() || '')
  const [fat, setFat] = useState(plan?.fat_g?.toString() || '')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)

    const { data, error } = await supabase
      .from('plans')
      .upsert({
        ...(plan?.id ? { id: plan.id } : {}),
        client_id: clientId,
        meal_plan: mealPlan,
        training_split: training,
        supplement_protocol: supplements,
        calories: calories ? parseInt(calories) : null,
        protein_g: protein ? parseInt(protein) : null,
        carbs_g: carbs ? parseInt(carbs) : null,
        fat_g: fat ? parseInt(fat) : null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    setSaving(false)

    if (error) { toast.error('Failed to save plans'); return }
    toast.success('Plans saved!')
    onSaved(data)
  }

  return (
    <div className="space-y-4">
      {/* Macro targets */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-zinc-400" />
          <h3 className="font-medium text-white text-sm">Daily Macro Targets</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Calories', value: calories, onChange: setCalories, unit: 'kcal' },
            { label: 'Protein', value: protein, onChange: setProtein, unit: 'g' },
            { label: 'Carbs', value: carbs, onChange: setCarbs, unit: 'g' },
            { label: 'Fat', value: fat, onChange: setFat, unit: 'g' },
          ].map(m => (
            <div key={m.label} className="space-y-1">
              <Label className="text-zinc-400 text-xs">{m.label} ({m.unit})</Label>
              <Input
                type="number"
                value={m.value}
                onChange={(e) => m.onChange(e.target.value)}
                placeholder="0"
                className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Plan content */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h3 className="font-medium text-white text-sm">Edit Client Plans</h3>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-white text-black hover:bg-zinc-200 h-8 px-3 text-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? 'Saving…' : 'Save All'}
          </Button>
        </div>

        <Tabs defaultValue="nutrition" className="p-4 space-y-3">
          <TabsList className="bg-zinc-800 border border-zinc-700">
            <TabsTrigger value="nutrition" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 flex items-center gap-1.5 text-xs">
              <Utensils className="w-3 h-3" /> Meal Plan
            </TabsTrigger>
            <TabsTrigger value="training" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 flex items-center gap-1.5 text-xs">
              <Dumbbell className="w-3 h-3" /> Training
            </TabsTrigger>
            <TabsTrigger value="supplements" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 flex items-center gap-1.5 text-xs">
              <Pill className="w-3 h-3" /> Supplements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nutrition">
            <RichTextEditor content={mealPlan} onChange={setMealPlan} />
          </TabsContent>
          <TabsContent value="training">
            <RichTextEditor content={training} onChange={setTraining} />
          </TabsContent>
          <TabsContent value="supplements">
            <RichTextEditor content={supplements} onChange={setSupplements} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
