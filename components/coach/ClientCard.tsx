'use client'

import { useEffect, useState } from 'react'
import { Profile, WeightLog } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight, TrendingDown, TrendingUp, Minus, Flag, UserX } from 'lucide-react'

interface Props {
  client: Profile
  coachId: string
  onClick: () => void
  onFlagToggle: (updated: Profile) => void
  onDrop?: (client: Profile) => void
}

interface CheckinSummary {
  week_start: string
  energy_level: number | null
  stress_level: number | null
  adherence_nutrition: number | null
  adherence_training: number | null
}

export default function ClientCard({ client, coachId, onClick, onFlagToggle, onDrop }: Props) {
  const [latestWeight, setLatestWeight] = useState<WeightLog | null>(null)
  const [prevWeight, setPrevWeight] = useState<WeightLog | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [flagging, setFlagging] = useState(false)
  const [latestCheckin, setLatestCheckin] = useState<CheckinSummary | null>(null)
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
      .select('id, week_start, energy_level, stress_level, adherence_nutrition, adherence_training, checkin_reads!left(coach_id)')
      .eq('client_id', client.id)
      .order('week_start', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (!data) return
        const unread = data.filter(c => {
          const reads = c.checkin_reads as { coach_id: string }[]
          return !reads.some(r => r.coach_id === coachId)
        })
        setUnreadCount(unread.length)
        if (data[0]) setLatestCheckin(data[0])
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

  // Warning signals from latest checkin
  const warnings: string[] = []
  if (latestCheckin) {
    if (latestCheckin.energy_level !== null && latestCheckin.energy_level <= 4) warnings.push(`Energy ${latestCheckin.energy_level}/10`)
    if (latestCheckin.stress_level !== null && latestCheckin.stress_level >= 8) warnings.push(`Stress ${latestCheckin.stress_level}/10`)
    if (latestCheckin.adherence_nutrition !== null && latestCheckin.adherence_nutrition <= 4) warnings.push(`Nutrition ${latestCheckin.adherence_nutrition}/10`)
  }

  const now = Date.now()
  const phaseWeeks = client.current_phase && client.phase_start_date
    ? Math.floor((now - new Date(client.phase_start_date).getTime()) / (7 * 86400000))
    : null
  const phaseEndMs = (client as any).phase_end_date ? new Date((client as any).phase_end_date).getTime() : null
  const weeksRemaining = phaseEndMs !== null ? Math.ceil((phaseEndMs - now) / (7 * 86400000)) : null
  const totalWeeks = client.phase_start_date && phaseEndMs
    ? Math.round((phaseEndMs - new Date(client.phase_start_date).getTime()) / (7 * 86400000))
    : null

  const checkinDaysAgo = latestCheckin
    ? Math.floor((Date.now() - new Date(latestCheckin.week_start + 'T00:00:00').getTime()) / 86400000)
    : null

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

      {/* Weight row */}
      {latestWeight ? (
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-white font-semibold text-sm">{latestWeight.weight_lbs} lbs</span>
          {diff !== null && (
            <span className={`text-xs flex items-center gap-0.5 ${diff < 0 ? 'text-green-400' : diff > 0 ? 'text-red-400' : 'text-[#555]'}`}>
              {diff < 0 ? <TrendingDown className="w-3 h-3" /> : diff > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {diff > 0 ? '+' : ''}{diff.toFixed(1)}
            </span>
          )}
        </div>
      ) : (
        <p className="text-[#444] text-xs mb-2.5">No weight logged yet</p>
      )}

      {/* Status row */}
      <div className="flex flex-wrap items-center gap-2">
        {client.current_phase && (
          <>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.18)' }}>
              {client.current_phase}
              {phaseWeeks !== null && phaseWeeks >= 0 ? ` W${phaseWeeks + 1}${totalWeeks ? `/${totalWeeks}` : ''}` : ''}
            </span>
            {weeksRemaining !== null && weeksRemaining > 0 && (
              <span className="text-xs text-zinc-600">{weeksRemaining}w left</span>
            )}
            {weeksRemaining !== null && weeksRemaining <= 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>Phase ended</span>
            )}
          </>
        )}
        {checkinDaysAgo !== null && (
          <span className="text-xs text-[#555]">
            Check-in {checkinDaysAgo === 0 ? 'today' : checkinDaysAgo === 1 ? '1d ago' : `${checkinDaysAgo}d ago`}
          </span>
        )}
        {warnings.map(w => (
          <span key={w} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            {w}
          </span>
        ))}
      </div>

      {/* Flag button */}
      <button
        onClick={toggleFlag}
        disabled={flagging}
        className="absolute bottom-3 right-8 p-1.5 rounded-lg transition-colors"
        style={client.flagged
          ? { color: '#f87171', background: 'rgba(239,68,68,0.12)' }
          : { color: '#444', background: 'transparent' }
        }
        title={client.flagged ? 'Remove flag' : 'Flag client for attention'}
      >
        <Flag className="w-3.5 h-3.5" />
      </button>

      {/* Drop button */}
      {onDrop && (
        <button
          onClick={e => {
            e.stopPropagation()
            if (confirm(`Drop ${client.full_name} as a client? They'll be moved to Past Clients.`)) {
              onDrop(client)
            }
          }}
          className="absolute bottom-3 right-2 p-1.5 rounded-lg transition-colors text-[#333] hover:text-[#888]"
          title="Drop client"
        >
          <UserX className="w-3.5 h-3.5" />
        </button>
      )}
    </button>
  )
}
