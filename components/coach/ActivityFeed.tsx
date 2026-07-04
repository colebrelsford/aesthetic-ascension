'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Scale, ClipboardList } from 'lucide-react'

interface FeedItem {
  id: string
  type: 'weight' | 'checkin'
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

      const [{ data: weights }, { data: checkins }] = await Promise.all([
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
        const p = w.profiles as { full_name: string }
        feed.push({
          id: `weight-${w.id}`,
          type: 'weight',
          clientName: p.full_name,
          description: `Logged ${w.weight_lbs} lbs`,
          time: w.created_at,
        })
      }

      for (const c of checkins || []) {
        const p = c.profiles as { full_name: string }
        const reads = c.checkin_reads as { coach_id: string }[]
        const isUnread = !reads.some(r => r.coach_id === coachId)
        feed.push({
          id: `checkin-${c.id}`,
          type: 'checkin',
          clientName: p.full_name,
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

  const emptyState = (msg: string) => (
    <div className="rounded-2xl p-8 text-center text-[#555] text-sm" style={{
      background: '#111',
      border: '1px solid rgba(201,168,76,0.1)',
    }}>{msg}</div>
  )

  if (loading) return emptyState('Loading activity…')
  if (items.length === 0) return emptyState('No recent activity in the last 14 days.')

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: '#111',
      border: '1px solid rgba(201,168,76,0.15)',
    }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
        <h3 className="font-semibold text-white text-sm">Recent Activity</h3>
        <p className="text-[#555] text-xs mt-0.5">Last 14 days across all clients</p>
      </div>
      <div>
        {items.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
            style={{
              borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
              background: item.isUnread ? 'rgba(201,168,76,0.04)' : undefined,
            }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{
              background: item.type === 'checkin' ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.05)',
            }}>
              {item.type === 'checkin'
                ? <ClipboardList className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
                : <Scale className="w-3.5 h-3.5 text-[#666]" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                <span className="font-medium">{item.clientName}</span>
                <span className="text-[#666]"> · {item.description}</span>
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              {item.isUnread && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#C9A84C' }} />
              )}
              <span className="text-[#555] text-xs">{timeAgo(item.time)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
