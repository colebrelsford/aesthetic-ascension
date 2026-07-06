'use client'

import { Plan } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RichTextEditor from '@/components/shared/RichTextEditor'
import { Utensils, Dumbbell, Pill, Info } from 'lucide-react'

interface Props {
  plan: Plan | null
}

const NUTRITION_REMINDERS = [
  '0 cal drinks and 0–15 cal sauces are okay in moderation.',
  'Ensure you have a proper food scale to measure each meal.',
  'Use "MyNetDiary" app to track calories if needed / macro match.',
  'Prep meals in advance where possible — consistency is the key.',
]

const TRAINING_REMINDERS = [
  'Track all lifts session to session in the Progression tab.',
  'Record "weight × reps" — try to beat your weight from last session, or add another rep.',
  'All working sets should be taken to failure with proper form.',
  '2–2.5 mins rest between working sets.',
  'Warm up before your first working set — 1–2 lighter sets at 50–60%.',
]

function Reminders({ items }: { items: string[] }) {
  return (
    <div className="mx-4 mb-4 rounded-xl p-4" style={{
      background: 'rgba(201,168,76,0.06)',
      border: '1px solid rgba(201,168,76,0.15)',
    }}>
      <div className="flex items-center gap-1.5 mb-3">
        <Info className="w-3.5 h-3.5 shrink-0" style={{ color: '#C9A84C' }} />
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#C9A84C' }}>Reminders</p>
      </div>
      <ul className="space-y-1.5">
        {items.map((tip, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-[#aaa]">
            <span className="mt-0.5 shrink-0 text-[#C9A84C]">·</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PlanViewer({ plan }: Props) {
  if (!plan) {
    return (
      <div className="rounded-2xl p-8 text-center text-[#555] text-sm" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.1)' }}>
        Your coach hasn&apos;t uploaded your plans yet. Check back soon!
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.15)' }}>
      <Tabs defaultValue="nutrition">
        <div className="px-4" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <TabsList className="bg-transparent h-auto p-0 gap-0">
            {[
              { value: 'nutrition', icon: <Utensils className="w-3.5 h-3.5" />, label: 'Meal Plan' },
              { value: 'training', icon: <Dumbbell className="w-3.5 h-3.5" />, label: 'Training' },
              { value: 'supplements', icon: <Pill className="w-3.5 h-3.5" />, label: 'Supplements' },
            ].map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A84C] data-[state=active]:bg-transparent px-4 py-3 text-[#555] data-[state=active]:text-[#C9A84C] flex items-center gap-1.5 text-xs font-medium"
              >
                {t.icon} {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="nutrition" className="m-0 pt-4">
          <Reminders items={NUTRITION_REMINDERS} />
          {plan.meal_plan ? (
            <RichTextEditor content={plan.meal_plan} editable={false} />
          ) : (
            <div className="p-6 text-[#555] text-sm">No meal plan set yet.</div>
          )}
        </TabsContent>

        <TabsContent value="training" className="m-0 pt-4">
          <Reminders items={TRAINING_REMINDERS} />
          {plan.training_split ? (
            <RichTextEditor content={plan.training_split} editable={false} />
          ) : (
            <div className="p-6 text-[#555] text-sm">No training split set yet.</div>
          )}
        </TabsContent>

        <TabsContent value="supplements" className="m-0">
          {plan.supplement_protocol ? (
            <RichTextEditor content={plan.supplement_protocol} editable={false} />
          ) : (
            <div className="p-6 text-[#555] text-sm">No supplement protocol set yet.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
