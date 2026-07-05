'use client'

import { useEffect, useState } from 'react'
import { Profile, WeightLog } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight, TrendingDown, TrendingUp, Minus, Flag } from 'lucide-react'

interface Props {
  client: Profile
  coachId: string
  onClick: () => void
  onFlagToggle: (updated: Profile) => void
}

export default function ClientCard({ client, coachId, onClick, onFlagToggle }: Props) {
  const [latestWeight, setLatestWeight] = useState<WeightLog | null>(null)
  const [prevWeight, setPrevWeight] = useState<WeightLog | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [flagging, setFlagging] = useState(false)
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

  async function toggleFlag(e: React.MouseEvent) {
    e.stopPropagation()
    setFlagging(true)
    const newVal = !client.flagged
    await supabase.from('profiles').update({ flagged: newVal }).eq('id', client.id)
    onFlagToggle({ ...client, flagged: newVal })
    setFlagging(false)
  }

  const diff = latestWeight && prevWeight ? latestWeight.weight_lbs - prevWeight.weight_lbs : null
  const initials = client.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-5 text-left w-full group transition-all relative"
      style={{
        background: 'linear-gradient(135deg, #111 0%, #141414 100%)',
        border: client.flagged ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(201,168,76,0.15)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(201,168,76,0.08)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none'
      }}
    >
      {client.flagged && (
        <div className="absolute top-3 right-10 w-2 h-2 rounded-full bg-red-500" />
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {client.avatar_url ? (
            <img src={client.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" style={{ border: '1px solid rgba(201,168,76,0.2)' }} />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0" style={{
              background: 'rgba(201,168,76,0.12)',
              color: '#C9A84C',
              border: '1px solid rgba(201,168,76,0.2)',
            }}>{initials}</div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white text-sm">{client.full_name}</p>
              {unreadCount > 0 && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full leading-none" style={{
                  background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#000',
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-[#555] text-xs mt-0.5">{client.email}</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#444] group-hover:text-[#C9A84C] transition-colors mt-0.5" />
      </div>

      {latestWeight ? (
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">{latestWeight.weight_lbs} lbs</span>
          {diff !== null && (
            <span className={`text-xs flex items-center gap-0.5 ${diff < 0 ? 'text-green-400' : diff > 0 ? 'text-red-400' : 'text-[#555]'}`}>
              {diff < 0 ? <TrendingDown className="w-3 h-3" /> : diff > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {diff > 0 ? '+' : ''}{diff.toFixed(1)}
            </span>
          )}
        </div>
      ) : (
        <p className="text-[#444] text-xs">No weight logged yet</p>
      )}

      {/* Flag button */}
      <button
        onClick={toggleFlag}
        disabled={flagging}
        className="absolute bottom-3 right-3 p-1.5 rounded-lg transition-colors"
        style={client.flagged
          ? { color: '#f87171', background: 'rgba(239,68,68,0.12)' }
          : { color: '#444', background: 'transparent' }
        }
        title={client.flagged ? 'Remove flag' : 'Flag client for attention'}
      >
        <Flag className="w-3.5 h-3.5" />
      </button>
    </button>
  )
}
