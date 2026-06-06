'use client'

import { Plan } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RichTextEditor from '@/components/shared/RichTextEditor'
import { Utensils, Dumbbell, Pill } from 'lucide-react'

interface Props {
  plan: Plan | null
}

export default function PlanViewer({ plan }: Props) {
  if (!plan) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
        Your coach hasn&apos;t uploaded your plans yet. Check back soon!
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <Tabs defaultValue="nutrition">
        <div className="border-b border-zinc-800 px-4">
          <TabsList className="bg-transparent h-auto p-0 gap-0">
            <TabsTrigger
              value="nutrition"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-4 py-3 text-zinc-400 data-[state=active]:text-white flex items-center gap-1.5"
            >
              <Utensils className="w-3.5 h-3.5" />
              Meal Plan
            </TabsTrigger>
            <TabsTrigger
              value="training"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-4 py-3 text-zinc-400 data-[state=active]:text-white flex items-center gap-1.5"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              Training
            </TabsTrigger>
            <TabsTrigger
              value="supplements"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-4 py-3 text-zinc-400 data-[state=active]:text-white flex items-center gap-1.5"
            >
              <Pill className="w-3.5 h-3.5" />
              Supplements
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="nutrition" className="m-0">
          {plan.meal_plan ? (
            <RichTextEditor content={plan.meal_plan} editable={false} />
          ) : (
            <div className="p-6 text-zinc-500 text-sm">No meal plan set yet.</div>
          )}
        </TabsContent>
        <TabsContent value="training" className="m-0">
          {plan.training_split ? (
            <RichTextEditor content={plan.training_split} editable={false} />
          ) : (
            <div className="p-6 text-zinc-500 text-sm">No training split set yet.</div>
          )}
        </TabsContent>
        <TabsContent value="supplements" className="m-0">
          {plan.supplement_protocol ? (
            <RichTextEditor content={plan.supplement_protocol} editable={false} />
          ) : (
            <div className="p-6 text-zinc-500 text-sm">No supplement protocol set yet.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
