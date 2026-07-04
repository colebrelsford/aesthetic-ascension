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
import ClientSettings from './PasswordChange'
import MacroTargets from './MacroTargets'
import ProfilePhotoUpload from './ProfilePhotoUpload'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Props {
  profile: Profile
}

const TAB_CLASS = `
  text-[#666] text-xs font-medium rounded-lg px-3 py-1.5 transition-all
  data-[state=active]:text-black data-[state=active]:font-semibold
`

const ACTIVE_STYLE = {
  background: 'linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)',
}

export default function ClientDashboard({ profile }: Props) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
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
    <div className="min-h-screen bg-black">
      <Navbar profile={profile} />

      {/* Hero greeting */}
      <div className="px-4 pt-8 pb-6 max-w-4xl mx-auto">
        <p className="text-[#888] text-xs uppercase tracking-widest mb-1">Welcome back</p>
        <h2 className="text-2xl font-bold text-white">{profile.full_name.split(' ')[0]}</h2>
        <div className="mt-3 h-px w-12" style={{ background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-10">
        <Tabs defaultValue="overview" className="space-y-5">
          <TabsList className="flex flex-wrap gap-1 p-1.5 rounded-xl h-auto" style={{
            background: '#111',
            border: '1px solid rgba(201,168,76,0.12)',
          }}>
            {['overview','progression','plans','measurements','checkin','history','settings'].map(tab => (
              <TabsTrigger
                key={tab}
                value={tab}
                className={TAB_CLASS}
                style={{ ['--tab-active-bg' as string]: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}
              >
                {tab === 'overview' ? 'Overview'
                  : tab === 'progression' ? 'Workouts'
                  : tab === 'plans' ? 'My Plans'
                  : tab === 'measurements' ? 'Measurements'
                  : tab === 'checkin' ? 'Check-in'
                  : tab === 'history' ? 'History'
                  : 'Settings'}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <MacroTargets plan={plan} />
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

          <TabsContent value="settings" className="space-y-4">
            <ProfilePhotoUpload
              profile={{ ...profile, avatar_url: avatarUrl }}
              onUpdated={setAvatarUrl}
            />
            <ClientSettings profile={profile} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
