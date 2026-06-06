'use client'

import { Profile } from '@/lib/types'
import { LogOut, Dumbbell } from 'lucide-react'

interface Props {
  profile: Profile
}

export default function Navbar({ profile }: Props) {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Dumbbell className="w-5 h-5 text-white" />
        <span className="font-semibold text-white text-sm">Aesthetic Ascension</span>
        {profile.role === 'coach' && (
          <span className="ml-2 text-xs bg-white text-black px-2 py-0.5 rounded-full font-medium">Coach</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-zinc-400 text-sm">{profile.full_name}</span>
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            className="text-zinc-400 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </nav>
  )
}
