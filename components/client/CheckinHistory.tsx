'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WeeklyCheckin } from '@/lib/types'
import { ClipboardList, ChevronDown, ChevronRight, Image } from 'lucide-react'

interface Props {
  clientId: string
}

interface CheckinWithPhotos extends WeeklyCheckin {
  photos: string[]
}

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-[#888]">{label}</span>
        <span className="font-semibold" style={{ color: '#C9A84C' }}>{value}/10</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{
          width: `${value * 10}%`,
          background: 'linear-gradient(90deg, #C9A84C, #E8C97A)',
        }} />
      </div>
    </div>
  )
}

function QA({ question, answer }: { question: string; answer: string | null }) {
  if (!answer) return null
  return (
    <div className="space-y-1">
      <p className="text-[#555] text-xs font-medium uppercase tracking-wider">{question}</p>
      <p className="text-[#ccc] text-sm leading-relaxed">{answer}</p>
    </div>
  )
}

export default function CheckinHistory({ clientId }: Props) {
  const [checkins, setCheckins] = useState<CheckinWithPhotos[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [lightbox, setLightbox] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('weekly_checkins')
        .select('*')
        .eq('client_id', clientId)
        .order('week_start', { ascending: false })

      if (!data) return

      // Fetch photos for each check-in
      const withPhotos = await Promise.all(data.map(async (c) => {
        const { data: photos } = await supabase
          .from('progress_photos')
          .select('photo_url')
          .eq('checkin_id', c.id)
          .order('taken_at', { ascending: true })
        return { ...c, photos: (photos || []).map(p => p.photo_url) }
      }))

      setCheckins(withPhotos)
    }
    load()
  }, [clientId])

  if (checkins.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center text-[#555] text-sm" style={{
        background: '#111',
        border: '1px solid rgba(201,168,76,0.15)',
      }}>
        No check-ins submitted yet.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {checkins.map(c => (
          <div key={c.id} className="rounded-2xl overflow-hidden" style={{
            background: '#111',
            border: '1px solid rgba(201,168,76,0.15)',
          }}>
            <button
              onClick={() => setExpanded(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
              className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(201,168,76,0.12)' }}>
                  <ClipboardList className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-white text-sm">
                    Week of {new Date(c.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  {c.photos.length > 0 && (
                    <p className="text-[#555] text-xs mt-0.5 flex items-center gap-1">
                      <Image className="w-3 h-3" />
                      {c.photos.length} photo{c.photos.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              {expanded[c.id]
                ? <ChevronDown className="w-4 h-4 text-[#555]" />
                : <ChevronRight className="w-4 h-4 text-[#555]" />
              }
            </button>

            {expanded[c.id] && (
              <div className="px-5 pb-5 space-y-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {/* Ratings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  <Bar value={c.energy_level} label="Energy" />
                  <Bar value={c.sleep_quality} label="Sleep Quality" />
                  <Bar value={c.stress_level} label="Stress" />
                  <Bar value={c.adherence_nutrition} label="Nutrition Adherence" />
                  <Bar value={c.adherence_training} label="Training Adherence" />
                </div>

                {/* Q&A */}
                <div className="space-y-3">
                  <QA question="Diet adherence" answer={c.diet_adherence} />
                  <QA question="Cardio adherence" answer={c.cardio_adherence} />
                  <QA question="3 wins" answer={c.three_wins} />
                  <QA question="3 struggles" answer={c.three_struggles} />
                  <QA question="Could have done better" answer={c.could_do_better} />
                  <QA question="Progression" answer={c.progression_notes} />
                </div>

                {/* Coach feedback */}
                {c.coach_feedback && (
                  <div className="rounded-xl p-4 space-y-1.5" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#C9A84C' }}>Coach Feedback</p>
                    <p className="text-[#ccc] text-sm leading-relaxed">{c.coach_feedback}</p>
                  </div>
                )}

                {/* Photos */}
                {c.photos.length > 0 && (
                  <div>
                    <p className="text-[#555] text-xs font-medium uppercase tracking-wider mb-2">Progress Photos</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {c.photos.map((url, i) => (
                        <button key={i} onClick={() => setLightbox(url)} className="aspect-square rounded-xl overflow-hidden" style={{ border: '1px solid rgba(201,168,76,0.15)' }}>
                          <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-2xl object-contain" />
        </div>
      )}
    </>
  )
}
