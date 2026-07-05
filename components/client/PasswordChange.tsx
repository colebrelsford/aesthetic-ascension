'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Lock, User, Bell, BellOff, CheckCircle } from 'lucide-react'

interface Props {
  profile: Profile
}

const cardStyle = {
  background: '#111',
  border: '1px solid rgba(201,168,76,0.15)',
}

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  borderColor: 'rgba(201,168,76,0.2)',
}

export default function ClientSettings({ profile }: Props) {
  const [fullName, setFullName] = useState(profile.full_name)
  const [nameSaving, setNameSaving] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passSaving, setPassSaving] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission)
    }
  }, [])

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { toast.error('Name cannot be empty'); return }
    setNameSaving(true)
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', profile.id)
    setNameSaving(false)
    if (error) { toast.error('Failed to update name'); return }
    toast.success('Name updated!')
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    setPassSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setPassSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Password updated!')
    setPassword('')
    setConfirm('')
  }

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
    if (permission === 'granted') {
      new Notification('Notifications enabled!', {
        body: "You'll get reminders when your check-in is due.",
        icon: '/logo.png',
      })
      toast.success('Notifications enabled!')
    } else {
      toast.error('Notifications blocked — enable them in your browser settings.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
            <User className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          </div>
          <h3 className="font-semibold text-white text-sm">Display Name</h3>
        </div>
        <form onSubmit={handleNameSave} className="flex gap-2 max-w-sm">
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="text-white rounded-xl"
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={nameSaving}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-black shrink-0 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}
          >
            {nameSaving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>

      {/* Notifications */}
      {notifPermission !== null && (
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
              <Bell className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
            </div>
            <h3 className="font-semibold text-white text-sm">Check-in Reminders</h3>
          </div>

          {notifPermission === 'granted' ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: '#C9A84C' }}>
              <CheckCircle className="w-4 h-4" />
              <span>Notifications are enabled on this device</span>
            </div>
          ) : notifPermission === 'denied' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-red-400">
                <BellOff className="w-4 h-4" />
                <span>Notifications are blocked</span>
              </div>
              <p className="text-[#555] text-xs">To fix this, go to your browser settings and allow notifications for this site.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[#888] text-sm">Enable notifications to get reminded when your weekly check-in is due.</p>
              <button
                onClick={enableNotifications}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-black"
                style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}
              >
                Enable Notifications
              </button>
            </div>
          )}
        </div>
      )}

      {/* Password */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
            <Lock className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          </div>
          <h3 className="font-semibold text-white text-sm">Change Password</h3>
        </div>
        <form onSubmit={handlePasswordSave} className="space-y-3 max-w-sm">
          <div className="space-y-1.5">
            <Label className="text-[#666] text-xs uppercase tracking-wider">New Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="text-white rounded-xl"
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#666] text-xs uppercase tracking-wider">Confirm Password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="text-white rounded-xl"
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={passSaving}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}
          >
            {passSaving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
