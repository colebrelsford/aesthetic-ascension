'use client'

import { useState, useEffect } from 'react'
import { Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/shared/Navbar'
import ClientCard from './ClientCard'
import ClientDetail from './ClientDetail'
import ActivityFeed from './ActivityFeed'
import { Users } from 'lucide-react'

interface Props {
  profile: Profile
}

export default function CoachDashboard({ profile }: Props) {
  const [clients, setClients] = useState<Profile[]>([])
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .then(({ data }) => { if (data) setClients(data) })
  }, [])

  if (selectedClient) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar profile={profile} />
        <ClientDetail client={selectedClient} coachId={profile.id} onBack={() => setSelectedClient(null)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar profile={profile} />

      {/* Coach hero */}
      <div className="px-4 pt-8 pb-6 max-w-5xl mx-auto">
        <p className="text-[#888] text-xs uppercase tracking-widest mb-1">Coach Portal</p>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <div className="mt-3 h-px w-12" style={{ background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-10 space-y-6">
        <ActivityFeed coachId={profile.id} />

        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.15)' }}>
              <Users className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
            </div>
            <h2 className="text-base font-semibold text-white">Your Clients</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{
              background: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.2)',
              color: '#C9A84C',
            }}>{clients.length}</span>
          </div>

          {clients.length === 0 ? (
            <div className="rounded-2xl text-[#555] text-sm text-center py-14" style={{
              border: '1px dashed rgba(201,168,76,0.15)',
            }}>
              No clients yet. Add clients through the Supabase dashboard.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map(client => (
                <ClientCard
                  key={client.id}
                  client={client}
                  coachId={profile.id}
                  onClick={() => setSelectedClient(client)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
