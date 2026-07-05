'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function usePushSubscription(clientId: string) {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window)
    checkSubscription()
  }, [clientId])

  async function checkSubscription() {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    setSubscribed(!!sub)
  }

  async function subscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setLoading(false); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })

      const json = sub.toJSON()
      const keys = json.keys as { p256dh: string; auth: string }

      await supabase.from('push_subscriptions').upsert({
        client_id: clientId,
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      }, { onConflict: 'client_id,endpoint' })

      setSubscribed(true)
    } catch (e) {
      console.error('Push subscribe error:', e)
    }
    setLoading(false)
  }

  async function unsubscribe() {
    setLoading(true)
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await sub.unsubscribe()
      await supabase.from('push_subscriptions').delete()
        .eq('client_id', clientId).eq('endpoint', sub.endpoint)
    }
    setSubscribed(false)
    setLoading(false)
  }

  return { subscribed, loading, supported, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
