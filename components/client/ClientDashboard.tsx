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
import MacroTargetViewer from './MacroTargetViewer'
import SupplementViewer from './SupplementViewer'
import MacroSummary from './MacroSummary'
import ProfilePhotoUpload from './ProfilePhotoUpload'
import HomeScreenPrompt from './HomeScreenPrompt'
import CheckinStreak from './CheckinStreak'
import OnboardingChecklist from './OnboardingChecklist'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Props {
  profile: Profile
}

const TAB_CLASS = `text-[#666] text-xs font-medium rounded-lg px-3 py-1.5 transition-all
  data-[state=active]:text-black data-[state=active]:font-semibold`

export default function ClientDashboard({ profile }: Props) {
  if (profile.status === 'dropped') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 className="text-white font-semibold text-xl mb-2">Access Paused</h2>
        <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
          Your coaching access has been paused. Reach out to your coach to get back on the program.
        </p>
      </div>
    )
  }

  const [plan, setPlan] = useState<Plan | null>(null)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [goalWeight, setGoalWeight] = useState<number | null>(profile.goal_weight_lbs)
  const [hasCheckin, setHasCheckin] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const supabase = createClient()

  useEffect(() => {
    if (typeof Notification !== 'undefined') setNotifPermission(Notification.permission)
  }, [])

  useEffect(() => {
    async function load() {
      const [{ data: planData }, { data: logs }, { data: checkins }] = await Promise.all([
        supabase.from('plans').select('*').eq('client_id', profile.id).single(),
        supabase.from('weight_logs').select('*').eq('client_id', profile.id).order('date', { ascending: true }),
        supabase.from('weekly_checkins').select('id').eq('client_id', profile.id).limit(1),
      ])
      if (planData) setPlan(planData)
      if (logs) setWeightLogs(logs)
      if (checkins && checkins.length > 0) setHasCheckin(true)
    }
    load()
  }, [profile.id])

  function onWeightLogged(log: WeightLog) {
    setWeightLogs(prev => [...prev, log].sort((a, b) => a.date.localeCompare(b.date)))
  }

  // Quick stats
  const startWeight = weightLogs[0]?.weight_lbs
  const currentWeight = weightLogs[weightLogs.length - 1]?.weight_lbs
  const totalChange = startWeight && currentWeight ? currentWeight - startWeight : null

  return (
    <div className="min-h-screen bg-black">
      <Navbar profile={profile} />
      <HomeScreenPrompt />

      <div className="px-4 pt-8 pb-6 max-w-4xl mx-auto">
        <p className="text-[#888] text-xs uppercase tracking-widest mb-1">Welcome back</p>
        <h2 className="text-2xl font-bold text-white">{profile.full_name.split(' ')[0]}</h2>
        {totalChange !== null && (
          <p className="text-xs mt-1" style={{ color: totalChange <= 0 ? '#4ade80' : '#f87171' }}>
            {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)} lbs since you started
          </p>
        )}
        {profile.current_phase && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
              {profile.current_phase}
              {profile.phase_start_date && (() => {
                const weeks = Math.floor((Date.now() - new Date(profile.phase_start_date).getTime()) / (7 * 86400000))
                return weeks >= 0 ? ` — Week ${weeks + 1}` : ''
              })()}
            </span>
          </div>
        )}
        <div className="mt-3 h-px w-12" style={{ background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-10">
        <Tabs defaultValue="overview" className="space-y-5">
          <TabsList className="flex flex-wrap gap-1 p-1.5 rounded-xl h-auto" style={{
            background: '#111',
            border: '1px solid rgba(201,168,76,0.12)',
          }}>
            {[
              { value: 'overview', label: 'Overview' },
              { value: 'progression', label: 'Workouts' },
              { value: 'plans', label: 'My Plans' },
              { value: 'measurements', label: 'Measurements' },
              { value: 'nutrition', label: 'Macro Matching' },
              { value: 'supplements', label: 'Supplements' },
              { value: 'checkin', label: 'Check-in' },
              { value: 'history', label: 'History' },
              { value: 'settings', label: 'Settings' },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value} className={TAB_CLASS}>{t.label}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <OnboardingChecklist
              hasWeight={weightLogs.length > 0}
              hasCheckin={hasCheckin}
              hasPhoto={!!profile.avatar_url}
              notificationsEnabled={notifPermission === 'granted'}
            />
            <CheckinStreak clientId={profile.id} />
            <MacroSummary clientId={profile.id} />
            {(plan?.cardio_type || plan?.target_daily_steps) && (
              <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Cardio & Activity Targets</p>
                <div className="flex flex-wrap gap-3">
                  {plan?.cardio_type && (
                    <div className="rounded-xl px-4 py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-white font-bold text-sm">{plan.cardio_type}</p>
                      <p className="text-zinc-600 text-xs mt-0.5">Type</p>
                    </div>
                  )}
                  {plan?.cardio_duration_min && (
                    <div className="rounded-xl px-4 py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-white font-bold text-sm">{plan.cardio_duration_min} min</p>
                      <p className="text-zinc-600 text-xs mt-0.5">Duration</p>
                    </div>
                  )}
                  {plan?.cardio_sessions_per_week && (
                    <div className="rounded-xl px-4 py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-white font-bold text-sm">{plan.cardio_sessions_per_week}×/week</p>
                      <p className="text-zinc-600 text-xs mt-0.5">Frequency</p>
                    </div>
                  )}
                  {plan?.target_daily_steps && (
                    <div className="rounded-xl px-4 py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-white font-bold text-sm">{plan.target_daily_steps.toLocaleString()}</p>
                      <p className="text-zinc-600 text-xs mt-0.5">Steps / day</p>
                    </div>
                  )}
                </div>
                {plan?.cardio_notes && (
                  <p className="text-zinc-500 text-xs mt-3">{plan.cardio_notes}</p>
                )}
                {plan?.cardio_type && (
                  <p className="text-zinc-600 text-xs mt-2">Keep heart rate between 125–140 BPM.</p>
                )}
              </div>
            )}
            <WeightLogger clientId={profile.id} onLogged={onWeightLogged} />
            <WeightChart
              logs={weightLogs}
              clientId={profile.id}
              goalWeight={goalWeight}
              onGoalSaved={setGoalWeight}
            />
          </TabsContent>

          <TabsContent value="progression">
            <WorkoutTracker clientId={profile.id} />
          </TabsContent>

          <TabsContent value="plans">
            <PlanViewer plan={plan} clientId={profile.id} />
          </TabsContent>

          <TabsContent value="measurements">
            <MeasurementsLogger clientId={profile.id} />
          </TabsContent>

          <TabsContent value="nutrition">
            <MacroTargetViewer clientId={profile.id} />
          </TabsContent>

          <TabsContent value="supplements">
            <SupplementViewer clientId={profile.id} />
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
