import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  const { clientId, title, body } = await req.json()
  const supabase = await createClient()

  // Get all push subscriptions for this client
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('client_id', clientId)

  if (error || !subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No subscriptions found' })
  }

  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: title || "Check-in Reminder",
          body: body || "Your coach is waiting — submit your weekly check-in now!",
          url: '/dashboard',
        })
      )
      sent++
    } catch (err: unknown) {
      // Subscription expired — remove it
      if ((err as { statusCode?: number }).statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return NextResponse.json({ sent })
}
