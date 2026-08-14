'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pill } from 'lucide-react'

interface Supplement {
  id: string
  name: string
  brand: string | null
  dosage: string | null
  timing: string
  frequency: string
  notes: string | null
}

interface Props {
  clientId: string
}

const TIMINGS = ['AM', 'With food', 'Pre-workout', 'Post-workout', 'PM', 'Before bed', 'As needed']

export default function SupplementViewer({ clientId }: Props) {
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('client_supplements').select('*')
        .eq('client_id', clientId).order('display_order')
      setSupplements(data || [])
      setLoading(false)
    }
    load()
  }, [clientId])

  if (loading) return null

  if (supplements.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Pill className="w-6 h-6 mx-auto mb-2 text-zinc-700" />
        <p className="text-zinc-600 text-sm">Your coach hasn&apos;t set up your supplement protocol yet.</p>
      </div>
    )
  }

  const grouped = TIMINGS.reduce<Record<string, Supplement[]>>((acc, t) => {
    acc[t] = supplements.filter(s => s.timing === t)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {TIMINGS.map(timing => {
        const items = grouped[timing]
        if (!items || items.length === 0) return null
        return (
          <div key={timing} className="rounded-2xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.1)' }}>
                <Pill className="w-3 h-3" style={{ color: '#C9A84C' }} />
              </div>
              <span className="text-white font-semibold text-sm">{timing}</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {items.map((s, i) => (
                <div key={s.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-zinc-100 text-sm font-medium">{s.name}</span>
                      {s.dosage && (
                        <span className="text-sm font-bold" style={{ color: '#C9A84C' }}>{s.dosage}</span>
                      )}
                      {s.brand && <span className="text-zinc-500 text-xs">· {s.brand}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-zinc-500 text-xs">{s.frequency}</span>
                      {s.notes && <span className="text-zinc-600 text-xs">· {s.notes}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
