'use client'

import { useState, useEffect } from 'react'
import { Profile, Plan, WeightLog, WeeklyCheckin, ProgressPhoto } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import WeightChart from '@/components/client/WeightChart'
import PlanEditor from './PlanEditor'
import PhotoComparison from './PhotoComparison'
import CheckinList from './CheckinList'
import ProgressionView from './ProgressionView'
import CoachNotes from './CoachNotes'

interface Props {
  client: Profile
  coachId: string
  onBack: () => void
}

export default function ClientDetail({ client, coachId, onBack }: Props) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([])
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [
        { data: planData },
        { data: logs },
        { data: checkinData },
        { data: photoData },
      ] = await Promise.all([
        supabase.from('plans').select('*').eq('client_id', client.id).single(),
        supabase.from('weight_logs').select('*').eq('client_id', client.id).order('date', { ascending: true }),
        supabase.from('weekly_checkins').select('*').eq('client_id', client.id).order('week_start', { ascending: false }),
        supabase.from('progress_photos').select('*').eq('client_id', client.id).order('taken_at', { ascending: false }),
      ])
      if (planData) setPlan(planData)
      if (logs) setWeightLogs(logs)
      if (checkinData) setCheckins(checkinData)
      if (photoData) setPhotos(photoData)
    }
    load()
  }, [client.id])

  // Mark all check-ins as read when coach opens this client
  useEffect(() => {
    async function markRead() {
      const { data: checkinData } = await supabase
        .from('weekly_checkins')
        .select('id')
        .eq('client_id', client.id)

      if (!checkinData || checkinData.length === 0) return

      const reads = checkinData.map(c => ({ checkin_id: c.id, coach_id: coachId }))
      await supabase.from('checkin_reads').upsert(reads, { onConflict: 'checkin_id,coach_id' })
    }
    markRead()
  }, [client.id, coachId])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-white">{client.full_name}</h2>
          <p className="text-zinc-500 text-xs">{client.email}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400">Overview</TabsTrigger>
          <TabsTrigger value="progression" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400">Progression</TabsTrigger>
          <TabsTrigger value="plans" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400">Plans</TabsTrigger>
          <TabsTrigger value="checkins" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400">Check-ins</TabsTrigger>
          <TabsTrigger value="photos" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400">Photos</TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <WeightChart logs={weightLogs} />
        </TabsContent>

        <TabsContent value="progression">
          <ProgressionView clientId={client.id} plan={plan} />
        </TabsContent>

        <TabsContent value="plans">
          <PlanEditor clientId={client.id} plan={plan} onSaved={setPlan} />
        </TabsContent>

        <TabsContent value="checkins">
          <CheckinList checkins={checkins} />
        </TabsContent>

        <TabsContent value="photos">
          <PhotoComparison photos={photos} />
        </TabsContent>

        <TabsContent value="notes">
          <CoachNotes clientId={client.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
