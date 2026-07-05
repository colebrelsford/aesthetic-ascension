'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flame } from 'lucide-react'

interface Props {
  clientId: string
}

function getWeekStart(date: Date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

export default function CheckinStreak({ clientId }: Props) {
  const [streak, setStreak] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('weekly_checkins')
        .select('week_start')
        .eq('client_id', clientId)
        .order('week_start', { ascending: false })

      if (!data || data.length === 0) return

      let count = 0
      let expected = getWeekStart(new Date())

      for (const c of data) {
        if (c.week_start === expected) {
          count++
          const prev = new Date(expected + 'T00:00:00')
          prev.setDate(prev.getDate() - 7)
          expected = prev.toISOString().split('T')[0]
        } else {
          break
        }
      }
      setStreak(count)
    }
    load()
  }, [clientId])

  if (streak === 0) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{
      background: streak >= 4 ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',
      border: streak >= 4 ? '1px solid rgba(201,168,76,0.25)' : '1px solid rgba(255,255,255,0.06)',
    }}>
      <Flame className="w-4 h-4" style={{ color: streak >= 4 ? '#C9A84C' : '#888' }} />
      <span className="text-sm font-semibold" style={{ color: streak >= 4 ? '#C9A84C' : '#888' }}>
        {streak} week{streak > 1 ? 's' : ''} in a row
      </span>
      {streak >= 4 && <span className="text-xs text-[#888]">— keep it up!</span>}
    </div>
  )
}
