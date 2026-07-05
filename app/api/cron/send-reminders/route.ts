import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Uses service role key to bypass RLS for server-side reads
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (not a random request)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const todayDay = today.getDay() // 0=Sun … 6=Sat

  // Find clients whose deadline day is today and have push subscriptions
  const { data: clients } = await supabase
    .from('profiles')
    .select('id, full_name, checkin_deadline_day')
    .eq('role', 'client')
    .eq('checkin_deadline_day', todayDay)

  if (!clients || clients.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No clients due today' })
  }

  // Figure out this week's start (Sunday)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekStartStr = weekStart.toISOString().split('T')[0]

  let sent = 0

  for (const client of clients) {
    // Skip if they already submitted this week
    const { data: existing } = await supabase
      .from('weekly_checkins')
      .select('id')
      .eq('client_id', client.id)
      .eq('week_start', weekStartStr)
      .single()

    if (existing) continue

    // Get their push subscriptions
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('client_id', client.id)

    if (!subs || subs.length === 0) continue

    const firstName = client.full_name.split(' ')[0]

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: '📋 Check-in Due Today',
            body: `Hey ${firstName}! Your weekly check-in is due — tap to submit now.`,
            url: '/dashboard',
          })
        )
        sent++
      } catch (err: unknown) {
        if ((err as { statusCode?: number }).statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }
  }

  return NextResponse.json({ sent })
}
