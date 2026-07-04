import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const today = new Date()
  const todayDay = today.getDay() // 0=Sun, 1=Mon ... 6=Sat

  // Get clients whose check-in deadline is today and reminders are enabled
  const { data: clients, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, checkin_deadline_day, checkin_reminder_enabled')
    .eq('role', 'client')
    .eq('checkin_deadline_day', todayDay)
    .eq('checkin_reminder_enabled', true)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  if (!clients || clients.length === 0) return new Response(JSON.stringify({ sent: 0 }))

  // Check which clients haven't submitted this week's check-in
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekStartStr = weekStart.toISOString().split('T')[0]

  let sent = 0
  for (const client of clients) {
    const { data: existing } = await supabase
      .from('weekly_checkins')
      .select('id')
      .eq('client_id', client.id)
      .eq('week_start', weekStartStr)
      .single()

    if (existing) continue // already checked in this week

    // Send reminder email via Supabase Auth admin
    await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: client.email,
      options: { redirectTo: 'https://aesthetic-ascension.vercel.app/dashboard' }
    })

    // Use Supabase's built-in email
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: client.email,
        subject: "Don't forget your weekly check-in! 💪",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #09090b; color: #fff; padding: 32px; border-radius: 12px;">
            <h2 style="color: #fff; margin-top: 0;">Hey ${client.full_name.split(' ')[0]}!</h2>
            <p style="color: #a1a1aa;">Your weekly check-in is due today. Your coach is waiting to review your progress!</p>
            <a href="https://aesthetic-ascension.vercel.app/dashboard"
               style="display: inline-block; background: #fff; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
              Submit Check-in
            </a>
            <p style="color: #52525b; font-size: 12px; margin-top: 24px;">Aesthetic Ascension Coaching</p>
          </div>
        `
      }
    })

    if (!emailError) sent++
  }

  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } })
})
