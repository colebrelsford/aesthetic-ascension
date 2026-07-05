'use client'

import { useState, useEffect } from 'react'
import { Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/shared/Navbar'
import ClientCard from './ClientCard'
import ClientDetail from './ClientDetail'
import ActivityFeed from './ActivityFeed'
import { useCheckinNotifications } from '@/hooks/useCheckinNotifications'
import { Users, Bell, BellOff } from 'lucide-react'

interface Props {
  profile: Profile
}

export default function CoachDashboard({ profile }: Props) {
  const [clients, setClients] = useState<Profile[]>([])
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const supabase = createClient()

  // Check current permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission)
    }
  }, [])

  // Listen for real-time check-in notifications
  useCheckinNotifications(notifPermission === 'granted')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .then(({ data }) => { if (data) setClients(data) })
  }, [])

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
    if (permission === 'granted') {
      new Notification('Notifications enabled!', {
        body: "You'll be notified when clients submit check-ins.",
        icon: '/logo.png',
      })
    }
  }

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
      <div className="px-4 pt-8 pb-4 max-w-5xl mx-auto flex items-end justify-between">
        <div>
          <p className="text-[#888] text-xs uppercase tracking-widest mb-1">Coach Portal</p>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <div className="mt-3 h-px w-12" style={{ background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
        </div>

        {/* Notification toggle */}
        <button
          onClick={notifPermission !== 'granted' ? enableNotifications : undefined}
          title={notifPermission === 'granted' ? 'Notifications on' : notifPermission === 'denied' ? 'Notifications blocked in browser settings' : 'Enable check-in notifications'}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
          style={notifPermission === 'granted'
            ? { background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }
            : { background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: '#666' }
          }
        >
          {notifPermission === 'granted'
            ? <><Bell className="w-3.5 h-3.5" /> Notifications on</>
            : notifPermission === 'denied'
            ? <><BellOff className="w-3.5 h-3.5" /> Blocked</>
            : <><Bell className="w-3.5 h-3.5" /> Enable notifications</>
          }
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-10 space-y-6 mt-4">
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
