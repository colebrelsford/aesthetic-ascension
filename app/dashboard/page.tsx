import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientDashboard from '@/components/client/ClientDashboard'
import CoachDashboard from '@/components/coach/CoachDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-center px-4">
        <div>
          <p className="text-white font-medium mb-2">Account setup incomplete</p>
          <p className="text-zinc-400 text-sm">Your profile wasn&apos;t created automatically. Please follow the fix in SETUP.md or contact support.</p>
          <p className="text-zinc-600 text-xs mt-3">User ID: {user.id}</p>
        </div>
      </div>
    )
  }

  if (profile.role === 'coach') {
    return <CoachDashboard profile={profile} />
  }

  return <ClientDashboard profile={profile} />
}
