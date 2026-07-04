'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'

export default function PasswordChange() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Password updated!')
    setPassword('')
    setConfirm('')
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="w-4 h-4 text-zinc-400" />
        <h3 className="font-medium text-white">Change Password</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
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
        <Button type="submit" disabled={saving} className="bg-white text-black hover:bg-zinc-200 font-medium">
          {saving ? 'Updating…' : 'Update Password'}
        </Button>
      </form>
    </div>
  )
}
