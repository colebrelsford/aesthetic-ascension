'use client'

import { useState } from 'react'
import { ProgressPhoto } from '@/lib/types'
import Image from 'next/image'
import { Images, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  photos: ProgressPhoto[]
}

function getWeekStart(iso: string) {
  const d = new Date(iso)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

function formatWeek(weekStart: string) {
  return new Date(weekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PhotoComparison({ photos }: Props) {
  const [leftId, setLeftId] = useState<string>('')
  const [rightId, setRightId] = useState<string>('')

  const leftPhoto = photos.find(p => p.id === leftId)
  const rightPhoto = photos.find(p => p.id === rightId)

  // Group photos by week
  const byWeek = photos.reduce<Record<string, ProgressPhoto[]>>((acc, p) => {
    const week = getWeekStart(p.taken_at)
    if (!acc[week]) acc[week] = []
    acc[week].push(p)
    return acc
  }, {})
  const weeks = Object.keys(byWeek).sort((a, b) => b.localeCompare(a))

  function handlePhotoClick(photo: ProgressPhoto) {
    if (!leftId) { setLeftId(photo.id); return }
    if (!rightId && photo.id !== leftId) { setRightId(photo.id); return }
  }

  function reset() {
    setLeftId('')
    setRightId('')
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
      {/* Comparison tool */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Images className="w-4 h-4 text-zinc-400" />
            <h3 className="font-medium text-white text-sm">Photo Comparison</h3>
          </div>
          {(leftId || rightId) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={reset}
              className="text-zinc-400 hover:text-white h-7 px-2 text-xs"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {(['left', 'right'] as const).map(side => {
            const photo = side === 'left' ? leftPhoto : rightPhoto
            const clearSide = () => side === 'left' ? setLeftId('') : setRightId('')

            return (
              <div key={side} className="space-y-2">
                <p className="text-zinc-500 text-xs text-center">{side === 'left' ? 'Before' : 'After'}</p>
                {photo ? (
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-zinc-700">
                    <Image src={photo.photo_url} alt="Progress photo" fill className="object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-2">
                      <p className="text-white text-xs">{formatDate(photo.taken_at)}</p>
                    </div>
                    <button
                      onClick={clearSide}
                      className="absolute top-1.5 right-1.5 bg-black/70 rounded-full p-0.5 hover:bg-black"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="aspect-[3/4] rounded-lg border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600 text-xs text-center px-2">
                    Click a photo below to select
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!leftId && !rightId && (
          <p className="text-zinc-600 text-xs text-center mt-3">Click any photo below to start comparing.</p>
        )}
      </div>

      {/* Photos grouped by week */}
      {weeks.map(week => (
        <div key={week} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800">
            <h4 className="text-sm font-medium text-white">Week of {formatWeek(week)}</h4>
          </div>
          <div className="p-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
            {byWeek[week].map(photo => {
              const isSelected = photo.id === leftId || photo.id === rightId
              return (
                <button
                  key={photo.id}
                  onClick={() => handlePhotoClick(photo)}
                  className={`relative aspect-square rounded-lg overflow-hidden border transition-colors ${
                    isSelected ? 'border-white' : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <Image src={photo.photo_url} alt="Progress" fill className="object-cover" />
                  {isSelected && (
                    <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                      <span className="bg-white text-black text-xs font-bold px-1.5 py-0.5 rounded">
                        {photo.id === leftId ? 'Before' : 'After'}
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
