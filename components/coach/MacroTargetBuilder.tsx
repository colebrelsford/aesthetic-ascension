'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Flame } from 'lucide-react'

interface Props {
  clientId: string
  coachId: string
}

interface MacroTarget {
  id: string
  protein_g: number
  carbs_g: number
  fat_g: number
  notes: string | null
}

function DonutChart({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const proteinCal = protein * 4
  const carbsCal = carbs * 4
  const fatCal = fat * 9
  const total = proteinCal + carbsCal + fatCal

  if (total === 0) {
    return (
      <div className="w-40 h-40 rounded-full flex items-center justify-center" style={{ border: '3px dashed rgba(255,255,255,0.08)' }}>
        <span className="text-zinc-700 text-xs">No data</span>
      </div>
    )
  }

  const cx = 80, cy = 80, r = 60, strokeW = 18
  const circ = 2 * Math.PI * r

  function slice(value: number, offset: number) {
    const pct = value / total
    return { dash: pct * circ, offset: -offset * circ }
  }

  const proteinPct = proteinCal / total
  const carbsPct = carbsCal / total

  const pSlice = slice(proteinCal, 0)
  const cSlice = slice(carbsCal, proteinPct)
  const fSlice = slice(fatCal, proteinPct + carbsPct)

  return (
    <div className="relative w-40 h-40 shrink-0">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeW} />
        {/* Protein — blue */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#60a5fa" strokeWidth={strokeW}
          strokeDasharray={`${pSlice.dash} ${circ}`} strokeDashoffset={pSlice.offset} strokeLinecap="butt" />
        {/* Carbs — green */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#34d399" strokeWidth={strokeW}
          strokeDasharray={`${cSlice.dash} ${circ}`} strokeDashoffset={cSlice.offset} strokeLinecap="butt" />
        {/* Fat — red */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f87171" strokeWidth={strokeW}
          strokeDasharray={`${fSlice.dash} ${circ}`} strokeDashoffset={fSlice.offset} strokeLinecap="butt" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xl font-bold" style={{ color: '#C9A84C' }}>{Math.round(total)}</p>
        <p className="text-zinc-500 text-xs">kcal</p>
      </div>
    </div>
  )
}

export default function MacroTargetBuilder({ clientId, coachId }: Props) {
  const [target, setTarget] = useState<MacroTarget | null>(null)
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const pro = parseFloat(protein) || 0
  const carb = parseFloat(carbs) || 0
  const fatG = parseFloat(fat) || 0
  const calories = Math.round(pro * 4 + carb * 4 + fatG * 9)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('macro_targets')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (data) {
        setTarget(data)
        setProtein(String(data.protein_g))
        setCarbs(String(data.carbs_g))
        setFat(String(data.fat_g))
        setNotes(data.notes || '')
      }
    }
    load()
  }, [clientId])

  async function save() {
    if (!pro && !carb && !fatG) { toast.error('Enter at least one macro target'); return }
    setSaving(true)
    const row = {
      client_id: clientId,
      coach_id: coachId,
      protein_g: pro,
      carbs_g: carb,
      fat_g: fatG,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    }
    if (target) {
      const { data, error } = await supabase.from('macro_targets').update(row).eq('id', target.id).select().single()
      if (!error && data) setTarget(data)
    } else {
      const { data, error } = await supabase.from('macro_targets').insert(row).select().single()
      if (!error && data) setTarget(data)
    }
    setSaving(false)
    toast.success('Macro targets saved')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl p-5 space-y-5" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.15)' }}>
            <Flame className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          </div>
          <h3 className="font-semibold text-white text-sm">Daily Macro Targets</h3>
        </div>

        {/* Chart + inputs side by side */}
        <div className="flex items-center gap-6 flex-wrap">
          <DonutChart protein={pro} carbs={carb} fat={fatG} />

          <div className="flex-1 space-y-3 min-w-48">
            {/* Calories readout */}
            <div className="rounded-xl px-4 py-3 text-center" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <p className="text-3xl font-bold" style={{ color: '#C9A84C' }}>{calories}</p>
              <p className="text-zinc-500 text-xs mt-0.5">calories / day</p>
            </div>

            {/* Macro inputs */}
            <div className="space-y-2">
              {[
                { label: 'Protein', color: '#60a5fa', value: protein, set: setProtein, kcal: pro * 4 },
                { label: 'Carbs',   color: '#34d399', value: carbs,   set: setCarbs,   kcal: carb * 4 },
                { label: 'Fat',     color: '#f87171', value: fat,     set: setFat,     kcal: fatG * 9 },
              ].map(({ label, color, value, set, kcal }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-zinc-400 text-xs w-14">{label}</span>
                  <Input
                    type="number"
                    value={value}
                    onChange={e => set(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-zinc-900 border-zinc-800 text-white text-sm h-8"
                  />
                  <span className="text-zinc-600 text-xs w-6">g</span>
                  <span className="text-zinc-600 text-xs w-16 text-right">{kcal > 0 ? `${Math.round(kcal)} kcal` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Per-macro % breakdown */}
        {calories > 0 && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Protein', pct: Math.round((pro * 4 / calories) * 100), color: '#60a5fa', g: pro },
              { label: 'Carbs',   pct: Math.round((carb * 4 / calories) * 100), color: '#34d399', g: carb },
              { label: 'Fat',     pct: Math.round((fatG * 9 / calories) * 100), color: '#f87171', g: fatG },
            ].map(({ label, pct, color, g }) => (
              <div key={label} className="rounded-xl py-2.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-lg font-bold" style={{ color }}>{pct}%</p>
                <p className="text-zinc-500 text-xs">{g}g {label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Optional coach notes */}
        <div>
          <p className="text-zinc-500 text-xs mb-1.5">Notes / instructions for client (optional)</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Hit protein first, then fill in carbs and fat around it. Track everything in MyNetDiary."
            rows={3}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white resize-none"
            style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}
        >
          {saving ? 'Saving…' : target ? 'Update targets' : 'Save targets'}
        </button>
      </div>
    </div>
  )
}
