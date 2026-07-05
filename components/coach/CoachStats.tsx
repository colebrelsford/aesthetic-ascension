'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  totalClients: number
}

export default function CoachStats({ totalClients }: Props) {
  const [checkedInThisWeek, setCheckedInThisWeek] = useState(0)
  const [notLoggedWeight, setNotLoggedWeight] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      // Week start (Sunday)
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      const weekStartStr = weekStart.toISOString().split('T')[0]

      // Clients who checked in this week
      const { data: checkins } = await supabase
        .from('weekly_checkins')
        .select('client_id')
        .gte('week_start', weekStartStr)
      const uniqueCheckins = new Set(checkins?.map(c => c.client_id) || [])
      setCheckedInThisWeek(uniqueCheckins.size)

      // Clients who haven't logged weight in 7+ days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

      const { data: recentLogs } = await supabase
        .from('weight_logs')
        .select('client_id')
        .gte('date', sevenDaysAgoStr)
      const recentClientIds = new Set(recentLogs?.map(l => l.client_id) || [])
      setNotLoggedWeight(Math.max(0, totalClients - recentClientIds.size))
    }
    if (totalClients > 0) load()
  }, [totalClients])

  const stats = [
    {
      icon: <Users className="w-4 h-4" style={{ color: '#C9A84C' }} />,
      label: 'Total clients',
      value: totalClients,
      color: '#C9A84C',
    },
    {
      icon: <CheckCircle className="w-4 h-4 text-green-400" />,
      label: 'Checked in this week',
      value: checkedInThisWeek,
      color: '#4ade80',
    },
    {
      icon: <AlertCircle className="w-4 h-4 text-red-400" />,
      label: 'No weight in 7 days',
      value: notLoggedWeight,
      color: notLoggedWeight > 0 ? '#f87171' : '#555',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(s => (
        <div key={s.label} className="rounded-2xl p-4 flex flex-col gap-2" style={{
          background: '#111',
          border: '1px solid rgba(201,168,76,0.12)',
        }}>
          {s.icon}
          <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          <p className="text-[#555] text-xs leading-tight">{s.label}</p>
        </div>
      ))}
    </div>
  )
}
