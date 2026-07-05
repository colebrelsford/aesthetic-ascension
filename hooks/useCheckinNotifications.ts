'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useCheckinNotifications(enabled: boolean) {
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!enabled) return

    // Subscribe to new check-in inserts via Realtime
    const channel = supabase
      .channel('coach-checkin-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'weekly_checkins' },
        async (payload) => {
          // Look up the client's name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.client_id)
            .single()

          const name = profile?.full_name ?? 'A client'
          const weekOf = new Date(payload.new.week_start + 'T00:00:00')
            .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

          if (Notification.permission === 'granted') {
            new Notification('New Check-in Received', {
              body: `${name} submitted their check-in for the week of ${weekOf}`,
              icon: '/logo.png',
              badge: '/logo.png',
            })
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled])
}
