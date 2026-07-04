'use client'

import { useEffect, useState } from 'react'
import { Profile, WeightLog } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight, TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface Props {
  client: Profile
  coachId: string
  onClick: () => void
}

export default function ClientCard({ client, coachId, onClick }: Props) {
  const [latestWeight, setLatestWeight] = useState<WeightLog | null>(null)
  const [prevWeight, setPrevWeight] = useState<WeightLog | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('weight_logs')
      .select('*')
      .eq('client_id', client.id)
      .order('date', { ascending: false })
      .limit(2)
      .then(({ data }) => {
        if (data?.[0]) setLatestWeight(data[0])
        if (data?.[1]) setPrevWeight(data[1])
      })

    // Count unread check-ins
    supabase
      .from('weekly_checkins')
      .select('id, checkin_reads!left(coach_id)')
      .eq('client_id', client.id)
      .then(({ data }) => {
        if (!data) return
        const unread = data.filter(c => {
          const reads = c.checkin_reads as { coach_id: string }[]
          return !reads.some(r => r.coach_id === coachId)
        })
        setUnreadCount(unread.length)
      })
  }, [client.id, coachId])

  const diff = latestWeight && prevWeight ? latestWeight.weight_lbs - prevWeight.weight_lbs : null

  return (
    <button
      onClick={onClick}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-600 transition-colors group w-full"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-white">{client.full_name}</p>
            {unreadCount > 0 && (
              <span className="bg-white text-black text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-zinc-500 text-xs mt-0.5">{client.email}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors mt-0.5" />
      </div>

      {latestWeight && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-white font-semibold">{latestWeight.weight_lbs} lbs</span>
          {diff !== null && (
            <span className={`text-xs flex items-center gap-0.5 ${diff < 0 ? 'text-green-400' : diff > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
              {diff < 0 ? <TrendingDown className="w-3 h-3" /> : diff > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {diff > 0 ? '+' : ''}{diff.toFixed(1)}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
