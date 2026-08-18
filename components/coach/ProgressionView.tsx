'use client'

import { Plan } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import WorkoutBuilder from './WorkoutBuilder'
import ClientWorkoutLog from './ClientWorkoutLog'

interface Props {
  clientId: string
  plan: Plan | null
}

export default function ProgressionView({ clientId }: Props) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="log">
        <TabsList className="bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="log" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 text-xs">
            Workout Log
          </TabsTrigger>
          <TabsTrigger value="builder" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 text-xs">
            Workout Builder
          </TabsTrigger>
        </TabsList>
        <TabsContent value="log" className="mt-4">
          <ClientWorkoutLog clientId={clientId} />
        </TabsContent>
        <TabsContent value="builder" className="mt-4">
          <WorkoutBuilder clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
