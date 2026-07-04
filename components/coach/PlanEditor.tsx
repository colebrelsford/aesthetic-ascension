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

  const cardStyle = {
    background: '#111',
    border: '1px solid rgba(201,168,76,0.15)',
  }

  return (
    <div className="space-y-4">
      {/* Macro targets */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
            <Flame className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          </div>
          <h3 className="font-semibold text-white text-sm">Daily Macro Targets</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Calories', value: calories, onChange: setCalories, unit: 'kcal' },
            { label: 'Protein', value: protein, onChange: setProtein, unit: 'g' },
            { label: 'Carbs', value: carbs, onChange: setCarbs, unit: 'g' },
            { label: 'Fat', value: fat, onChange: setFat, unit: 'g' },
          ].map(m => (
            <div key={m.label} className="space-y-1.5">
              <Label className="text-[#666] text-xs uppercase tracking-wider">{m.label} ({m.unit})</Label>
              <Input
                type="number"
                value={m.value}
                onChange={(e) => m.onChange(e.target.value)}
                placeholder="0"
                className="text-white h-9 text-sm rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Plan content */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <h3 className="font-semibold text-white text-sm">Client Plans</h3>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-black transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)' }}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save All'}
          </button>
        </div>

        <div className="p-5">
          <Tabs defaultValue="nutrition" className="space-y-4">
            <TabsList className="flex gap-1 p-1 rounded-xl h-auto" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { value: 'nutrition', icon: <Utensils className="w-3 h-3" />, label: 'Meal Plan' },
                { value: 'training', icon: <Dumbbell className="w-3 h-3" />, label: 'Training' },
                { value: 'supplements', icon: <Pill className="w-3 h-3" />, label: 'Supplements' },
              ].map(t => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="flex items-center gap-1.5 text-xs text-[#666] rounded-lg px-3 py-1.5 data-[state=active]:text-black data-[state=active]:font-semibold"
                >
                  {t.icon} {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="nutrition"><RichTextEditor content={mealPlan} onChange={setMealPlan} /></TabsContent>
            <TabsContent value="training"><RichTextEditor content={training} onChange={setTraining} /></TabsContent>
            <TabsContent value="supplements"><RichTextEditor content={supplements} onChange={setSupplements} /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
