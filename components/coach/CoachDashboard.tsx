'use client'

import { useState, useEffect } from 'react'
import { Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/shared/Navbar'
import ClientCard from './ClientCard'
import ClientDetail from './ClientDetail'
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
      <div className="min-h-screen bg-zinc-950">
        <Navbar profile={profile} />
        <ClientDetail client={selectedClient} onBack={() => setSelectedClient(null)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar profile={profile} />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-zinc-400" />
          <h2 className="text-xl font-semibold text-white">Your Clients</h2>
          <span className="text-zinc-500 text-sm ml-1">({clients.length})</span>
        </div>

        {clients.length === 0 ? (
          <div className="text-zinc-500 text-sm text-center py-12 border border-dashed border-zinc-800 rounded-xl">
            No clients yet. Add clients through the Supabase dashboard.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map(client => (
              <ClientCard
                key={client.id}
                client={client}
                onClick={() => setSelectedClient(client)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
