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

const TAB = `text-[#666] text-xs font-medium rounded-lg px-3 py-1.5 transition-all
  data-[state=active]:text-black data-[state=active]:font-semibold`

export default function ClientDetail({ client, coachId, onBack }: Props) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([])
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: planData }, { data: logs }, { data: checkinData }, { data: photoData }] = await Promise.all([
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

  useEffect(() => {
    async function markRead() {
      const { data: checkinData } = await supabase
        .from('weekly_checkins').select('id').eq('client_id', client.id)
      if (!checkinData || checkinData.length === 0) return
      const reads = checkinData.map(c => ({ checkin_id: c.id, coach_id: coachId }))
      await supabase.from('checkin_reads').upsert(reads, { onConflict: 'checkin_id,coach_id' })
    }
    markRead()
  }, [client.id, coachId])

  const initials = client.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors text-[#888] hover:text-[#C9A84C]"
          style={{ background: '#111', border: '1px solid rgba(201,168,76,0.15)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          {client.avatar_url ? (
            <img src={client.avatar_url} alt="" className="w-11 h-11 rounded-xl object-cover" style={{ border: '1px solid rgba(201,168,76,0.2)' }} />
          ) : (
            <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold" style={{
              background: 'rgba(201,168,76,0.12)',
              color: '#C9A84C',
              border: '1px solid rgba(201,168,76,0.2)',
            }}>{initials}</div>
          )}
          <div>
            <h2 className="text-lg font-bold text-white">{client.full_name}</h2>
            <p className="text-[#555] text-xs">{client.email}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="flex flex-wrap gap-1 p-1.5 rounded-xl h-auto" style={{
          background: '#111',
          border: '1px solid rgba(201,168,76,0.12)',
        }}>
          {[
            { value: 'overview', label: 'Overview' },
            { value: 'progression', label: 'Progression' },
            { value: 'plans', label: 'Plans' },
            { value: 'checkins', label: 'Check-ins' },
            { value: 'photos', label: 'Photos' },
            { value: 'notes', label: 'Notes' },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value} className={TAB}>
              {t.label}
            </TabsTrigger>
          ))}
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
