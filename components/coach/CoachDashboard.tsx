'use client'

import { useState, useEffect } from 'react'
import { Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/shared/Navbar'
import ClientCard from './ClientCard'
import ClientDetail from './ClientDetail'
import ActivityFeed from './ActivityFeed'
import { useCheckinNotifications } from '@/hooks/useCheckinNotifications'
import { Users, Bell, BellOff, Search, Flag } from 'lucide-react'

interface Props {
  profile: Profile
}

type SortOption = 'name' | 'flagged'

export default function CoachDashboard({ profile }: Props) {
  const [clients, setClients] = useState<Profile[]>([])
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('name')
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (typeof Notification !== 'undefined') setNotifPermission(Notification.permission)
  }, [])

  useCheckinNotifications(notifPermission === 'granted')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .then(({ data }) => { if (data) setClients(data) })
  }, [])

  function updateClient(updated: Profile) {
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

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

  const filtered = clients
    .filter(c => {
      const matchSearch = c.full_name.toLowerCase().includes(search.toLowerCase())
      const matchFlag = showFlaggedOnly ? c.flagged : true
      return matchSearch && matchFlag
    })
    .sort((a, b) => {
      if (sort === 'flagged') return (b.flagged ? 1 : 0) - (a.flagged ? 1 : 0)
      return a.full_name.localeCompare(b.full_name)
    })

  if (selectedClient) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar profile={profile} />
        <ClientDetail
          client={selectedClient}
          coachId={profile.id}
          onBack={() => setSelectedClient(null)}
          onClientUpdate={updateClient}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar profile={profile} />

      <div className="px-4 pt-8 pb-4 max-w-5xl mx-auto flex items-end justify-between">
        <div>
          <p className="text-[#888] text-xs uppercase tracking-widest mb-1">Coach Portal</p>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <div className="mt-3 h-px w-12" style={{ background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
        </div>
        <button
          onClick={notifPermission !== 'granted' ? enableNotifications : undefined}
          title={notifPermission === 'granted' ? 'Notifications on' : 'Enable check-in notifications'}
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
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.15)' }}>
                <Users className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
              </div>
              <h2 className="text-base font-semibold text-white">Your Clients</h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: '#C9A84C',
              }}>{filtered.length}</span>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[160px] relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search clients…"
                className="w-full text-sm text-white rounded-xl pl-8 pr-3 py-2 outline-none"
                style={{ background: '#111', border: '1px solid rgba(201,168,76,0.12)' }}
              />
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
              className="text-xs rounded-xl px-3 py-2 text-white outline-none"
              style={{ background: '#111', border: '1px solid rgba(201,168,76,0.12)', color: '#888' }}
            >
              <option value="name">A → Z</option>
              <option value="flagged">Flagged first</option>
            </select>

            {/* Flag filter */}
            <button
              onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all"
              style={showFlaggedOnly
                ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }
                : { background: '#111', border: '1px solid rgba(201,168,76,0.12)', color: '#666' }
              }
            >
              <Flag className="w-3 h-3" />
              {showFlaggedOnly ? 'Flagged only' : 'All clients'}
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl text-[#555] text-sm text-center py-14" style={{ border: '1px dashed rgba(201,168,76,0.15)' }}>
              {showFlaggedOnly ? 'No flagged clients.' : 'No clients match your search.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(client => (
                <ClientCard
                  key={client.id}
                  client={client}
                  coachId={profile.id}
                  onClick={() => setSelectedClient(client)}
                  onFlagToggle={updateClient}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
