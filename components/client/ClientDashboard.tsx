'use client'

import { useState, useEffect } from 'react'
import { Profile, Plan, WeightLog } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/shared/Navbar'
import WeightLogger from './WeightLogger'
import WeightChart from './WeightChart'
import PlanViewer from './PlanViewer'
import WeeklyCheckinForm from './WeeklyCheckinForm'
import CheckinHistory from './CheckinHistory'
import WorkoutTracker from './WorkoutTracker'
import MeasurementsLogger from './MeasurementsLogger'
import PasswordChange from './PasswordChange'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Props {
  profile: Profile
}

export default function ClientDashboard({ profile }: Props) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: planData }, { data: logs }] = await Promise.all([
        supabase.from('plans').select('*').eq('client_id', profile.id).single(),
        supabase.from('weight_logs').select('*').eq('client_id', profile.id).order('date', { ascending: true }),
      ])
      if (planData) setPlan(planData)
      if (logs) setWeightLogs(logs)
    }
    load()
  }, [profile.id])

  function onWeightLogged(log: WeightLog) {
    setWeightLogs(prev => [...prev, log].sort((a, b) => a.date.localeCompare(b.date)))
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar profile={profile} />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Hey, {profile.full_name.split(' ')[0]} 👋</h2>
          <p className="text-zinc-400 text-sm mt-0.5">Track your progress and stay on plan.</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 text-xs">Overview</TabsTrigger>
            <TabsTrigger value="progression" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 text-xs">Workouts</TabsTrigger>
            <TabsTrigger value="plans" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 text-xs">My Plans</TabsTrigger>
            <TabsTrigger value="measurements" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 text-xs">Measurements</TabsTrigger>
            <TabsTrigger value="checkin" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 text-xs">Check-in</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 text-xs">History</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 text-xs">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <WeightLogger clientId={profile.id} onLogged={onWeightLogged} />
            <WeightChart logs={weightLogs} />
          </TabsContent>

          <TabsContent value="progression">
            <WorkoutTracker clientId={profile.id} />
          </TabsContent>

          <TabsContent value="plans">
            <PlanViewer plan={plan} />
          </TabsContent>

          <TabsContent value="measurements">
            <MeasurementsLogger clientId={profile.id} />
          </TabsContent>

          <TabsContent value="checkin">
            <WeeklyCheckinForm clientId={profile.id} />
          </TabsContent>

          <TabsContent value="history">
            <CheckinHistory clientId={profile.id} />
          </TabsContent>

          <TabsContent value="settings">
            <PasswordChange />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
