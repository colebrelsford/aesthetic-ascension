'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Scale, ClipboardList, TrendingUp } from 'lucide-react'

interface FeedItem {
  id: string
  type: 'weight' | 'checkin' | 'pr'
  clientName: string
  description: string
  time: string
  isUnread?: boolean
}

interface Props {
  coachId: string
}

export default function ActivityFeed({ coachId }: Props) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const since = new Date()
      since.setDate(since.getDate() - 14)
      const sinceStr = since.toISOString()

      const [
        { data: weights },
        { data: checkins },
      ] = await Promise.all([
        supabase
          .from('weight_logs')
          .select('*, profiles(full_name)')
          .gte('created_at', sinceStr)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('weekly_checkins')
          .select('*, profiles(full_name), checkin_reads!left(coach_id)')
          .gte('created_at', sinceStr)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      const feed: FeedItem[] = []

      for (const w of weights || []) {
        const profile = w.profiles as { full_name: string }
        feed.push({
          id: `weight-${w.id}`,
          type: 'weight',
          clientName: profile.full_name,
          description: `Logged ${w.weight_lbs} lbs`,
          time: w.created_at,
        })
      }

      for (const c of checkins || []) {
        const profile = c.profiles as { full_name: string }
        const reads = c.checkin_reads as { coach_id: string }[]
        const isUnread = !reads.some(r => r.coach_id === coachId)
        feed.push({
          id: `checkin-${c.id}`,
          type: 'checkin',
          clientName: profile.full_name,
          description: `Submitted week of ${new Date(c.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} check-in`,
          time: c.created_at,
          isUnread,
        })
      }

      feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setItems(feed.slice(0, 30))
      setLoading(false)
    }
    load()
  }, [coachId])

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (mins > 0) return `${mins}m ago`
    return 'just now'
  }

  const icons = {
    weight: <Scale className="w-3.5 h-3.5 text-zinc-400" />,
    checkin: <ClipboardList className="w-3.5 h-3.5 text-zinc-400" />,
    pr: <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />,
  }

  if (loading) return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500 text-sm">
      Loading activity…
    </div>
  )

  if (items.length === 0) return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500 text-sm">
      No recent activity in the last 14 days.
    </div>
  )

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="font-medium text-white text-sm">Recent Activity</h3>
        <p className="text-zinc-500 text-xs mt-0.5">Last 14 days across all clients</p>
      </div>
      <div className="divide-y divide-zinc-800">
        {items.map(item => (
          <div key={item.id} className={`flex items-start gap-3 px-4 py-3 ${item.isUnread ? 'bg-zinc-800/50' : ''}`}>
            <div className="mt-0.5">{icons[item.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">
                <span className="font-medium">{item.clientName}</span>
                {' '}<span className="text-zinc-400">{item.description}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.isUnread && <span className="w-2 h-2 rounded-full bg-white" />}
              <span className="text-zinc-500 text-xs">{timeAgo(item.time)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
