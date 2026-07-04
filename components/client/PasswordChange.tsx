'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Lock, User, Bell } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface Props {
  profile: Profile
}

export default function ClientSettings({ profile }: Props) {
  const [fullName, setFullName] = useState(profile.full_name)
  const [nameSaving, setNameSaving] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passSaving, setPassSaving] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(profile.checkin_reminder_enabled ?? false)
  const [deadlineDay, setDeadlineDay] = useState(profile.checkin_deadline_day ?? 0)
  const [reminderSaving, setReminderSaving] = useState(false)
  const supabase = createClient()

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { toast.error('Name cannot be empty'); return }
    setNameSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', profile.id)
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

  async function handleReminderSave() {
    setReminderSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ checkin_reminder_enabled: reminderEnabled, checkin_deadline_day: deadlineDay })
      .eq('id', profile.id)
    setReminderSaving(false)
    if (error) { toast.error('Failed to save reminder settings'); return }
    toast.success('Reminder settings saved!')
  }

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-zinc-400" />
          <h3 className="font-medium text-white">Display Name</h3>
        </div>
        <form onSubmit={handleNameSave} className="flex gap-2 max-w-sm">
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
          <Button type="submit" disabled={nameSaving} className="bg-white text-black hover:bg-zinc-200 shrink-0">
            {nameSaving ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </div>

      {/* Check-in Reminder */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-zinc-400" />
          <h3 className="font-medium text-white">Check-in Reminder</h3>
        </div>
        <div className="space-y-3 max-w-sm">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={e => setReminderEnabled(e.target.checked)}
              className="w-4 h-4 accent-white"
            />
            <span className="text-zinc-300 text-sm">Email me a reminder on my check-in day</span>
          </label>
          {reminderEnabled && (
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Reminder Day</Label>
              <select
                value={deadlineDay}
                onChange={e => setDeadlineDay(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm"
              >
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </div>
          )}
          <Button onClick={handleReminderSave} disabled={reminderSaving} className="bg-white text-black hover:bg-zinc-200">
            {reminderSaving ? 'Saving…' : 'Save Reminder'}
          </Button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-zinc-400" />
          <h3 className="font-medium text-white">Change Password</h3>
        </div>
        <form onSubmit={handlePasswordSave} className="space-y-3 max-w-sm">
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">New Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Confirm Password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <Button type="submit" disabled={passSaving} className="bg-white text-black hover:bg-zinc-200 font-medium">
            {passSaving ? 'Updating…' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
