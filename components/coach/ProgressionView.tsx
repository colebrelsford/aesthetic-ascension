'use client'

import { useState } from 'react'
import { Plan } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import WorkoutBuilder from './WorkoutBuilder'

interface Props {
  clientId: string
  plan: Plan | null
}

export default function ProgressionView({ clientId }: Props) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="builder">
        <TabsList className="bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="builder" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 text-xs">
            Workout Builder
          </TabsTrigger>
        </TabsList>
        <TabsContent value="builder" className="mt-4">
          <WorkoutBuilder clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
