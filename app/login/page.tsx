'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 relative overflow-hidden">
      {/* Ambient gold glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#C9A84C] opacity-[0.04] blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8C97A 50%, #C9A84C 100%)' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L20 10H28L22 15L24 23L16 18L8 23L10 15L4 10H12L16 2Z" fill="#000" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{
            background: 'linear-gradient(135deg, #C9A84C 0%, #E8C97A 50%, #C9A84C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Aesthetic Ascension
          </h1>
          <p className="text-[#888] mt-2 text-sm">Sign in to your coaching portal</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl p-6 space-y-4" style={{
          background: 'linear-gradient(135deg, #141414 0%, #1C1C1C 100%)',
          border: '1px solid rgba(201,168,76,0.2)',
          boxShadow: '0 0 40px rgba(201,168,76,0.05), 0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[#888] text-xs uppercase tracking-wider">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="border text-white placeholder:text-[#555] h-11 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(201,168,76,0.2)' }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[#888] text-xs uppercase tracking-wider">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="border text-white placeholder:text-[#555] h-11 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(201,168,76,0.2)' }}
            />
          </div>

          <Button
            type="submit"
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-11 rounded-xl font-semibold text-black mt-2 btn-gold"
            style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8C97A 50%, #C9A84C 100%)' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </div>

        <p className="text-center text-[#444] text-xs mt-6">Aesthetic Ascension Coaching · Members Only</p>
      </div>
    </div>
  )
}
