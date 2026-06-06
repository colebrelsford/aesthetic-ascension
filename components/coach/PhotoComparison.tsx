'use client'

import { useState } from 'react'
import { ProgressPhoto } from '@/lib/types'
import Image from 'next/image'
import { Images } from 'lucide-react'

interface Props {
  photos: ProgressPhoto[]
}

export default function PhotoComparison({ photos }: Props) {
  const [leftId, setLeftId] = useState<string>('')
  const [rightId, setRightId] = useState<string>('')

  const leftPhoto = photos.find(p => p.id === leftId)
  const rightPhoto = photos.find(p => p.id === rightId)

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (photos.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
        No progress photos submitted yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Side by side comparison */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Images className="w-4 h-4 text-zinc-400" />
          <h3 className="font-medium text-white text-sm">Photo Comparison</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {(['left', 'right'] as const).map(side => {
            const selectedId = side === 'left' ? leftId : rightId
            const setId = side === 'left' ? setLeftId : setRightId
            const photo = side === 'left' ? leftPhoto : rightPhoto

            return (
              <div key={side} className="space-y-2">
                <select
                  value={selectedId}
                  onChange={(e) => setId(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-zinc-500"
                >
                  <option value="">Select photo…</option>
                  {photos.map(p => (
                    <option key={p.id} value={p.id}>
                      {formatDate(p.taken_at)}{p.caption ? ` — ${p.caption}` : ''}
                    </option>
                  ))}
                </select>

                {photo ? (
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-zinc-700">
                    <Image src={photo.photo_url} alt="Progress photo" fill className="object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-2">
                      <p className="text-white text-xs">{formatDate(photo.taken_at)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[3/4] rounded-lg border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600 text-sm">
                    {side === 'left' ? 'Before' : 'After'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* All photos grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="font-medium text-white text-sm mb-3">All Photos</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer"
              onClick={() => {
                if (!leftId) setLeftId(photo.id)
                else if (!rightId && photo.id !== leftId) setRightId(photo.id)
              }}
            >
              <Image src={photo.photo_url} alt="Progress" fill className="object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-1">
                <p className="text-white text-[10px]">{formatDate(photo.taken_at)}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-zinc-600 text-xs mt-2">Click photos to select them for comparison above.</p>
      </div>
    </div>
  )
}
