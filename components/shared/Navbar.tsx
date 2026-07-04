'use client'

import { Profile } from '@/lib/types'
import { LogOut } from 'lucide-react'

interface Props {
  profile: Profile
}

export default function Navbar({ profile }: Props) {
  return (
    <nav className="px-5 py-3.5 flex items-center justify-between sticky top-0 z-50" style={{
      background: 'rgba(0,0,0,0.85)',
      borderBottom: '1px solid rgba(201,168,76,0.15)',
      backdropFilter: 'blur(12px)',
    }}>
      <div className="flex items-center gap-3">
        {/* Logo mark */}
        <img src="/logo.png" alt="Aesthetic Ascension" className="w-8 h-8 rounded-lg object-cover shrink-0" />
        <span className="font-bold text-sm tracking-wide" style={{
          background: 'linear-gradient(135deg, #C9A84C 0%, #E8C97A 60%, #C9A84C 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Aesthetic Ascension
        </span>
        {profile.role === 'coach' && (
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{
            background: 'rgba(201,168,76,0.15)',
            border: '1px solid rgba(201,168,76,0.3)',
            color: '#C9A84C',
          }}>
            Coach
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[#888] text-sm hidden sm:block">{profile.full_name}</span>
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            className="text-[#555] hover:text-[#C9A84C] transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </nav>
  )
}
