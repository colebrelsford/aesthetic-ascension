'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Flame, Plus, Trash2, X, Check } from 'lucide-react'

interface Props {
  clientId: string
  coachId: string
}

interface MacroTarget {
  id: string
  name: string
  protein_g: number
  carbs_g: number
  fat_g: number
  calories_override: number | null
  notes: string | null
}

function DonutChart({ protein, carbs, fat, caloriesOverride }: { protein: number; carbs: number; fat: number; caloriesOverride?: number }) {
  const proteinCal = protein * 4
  const carbsCal = carbs * 4
  const fatCal = fat * 9
  const total = proteinCal + carbsCal + fatCal

  if (total === 0) {
    return (
      <div className="w-40 h-40 rounded-full flex items-center justify-center shrink-0" style={{ border: '3px dashed rgba(255,255,255,0.08)' }}>
        <span className="text-zinc-700 text-xs">No data</span>
      </div>
    )
  }

  const cx = 80, cy = 80, r = 60, strokeW = 18
  const circ = 2 * Math.PI * r
  const proteinPct = proteinCal / total
  const carbsPct = carbsCal / total

  function seg(value: number, offset: number) {
    return { dash: (value / total) * circ, offset: -offset * circ }
  }

  const pSeg = seg(proteinCal, 0)
  const cSeg = seg(carbsCal, proteinPct)
  const fSeg = seg(fatCal, proteinPct + carbsPct)

  return (
    <div className="relative w-40 h-40 shrink-0">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeW} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#60a5fa" strokeWidth={strokeW}
          strokeDasharray={`${pSeg.dash} ${circ}`} strokeDashoffset={pSeg.offset} strokeLinecap="butt" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#34d399" strokeWidth={strokeW}
          strokeDasharray={`${cSeg.dash} ${circ}`} strokeDashoffset={cSeg.offset} strokeLinecap="butt" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f87171" strokeWidth={strokeW}
          strokeDasharray={`${fSeg.dash} ${circ}`} strokeDashoffset={fSeg.offset} strokeLinecap="butt" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xl font-bold" style={{ color: '#C9A84C' }}>{caloriesOverride ?? Math.round(total)}</p>
        <p className="text-zinc-500 text-xs">kcal</p>
      </div>
    </div>
  )
}

const EMPTY_FORM = { protein: '', carbs: '', fat: '', caloriesOverride: '', notes: '' }

export default function MacroTargetBuilder({ clientId, coachId }: Props) {
  const [plans, setPlans] = useState<MacroTarget[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [addingPlan, setAddingPlan] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const supabase = createClient()

  const selected = plans.find(p => p.id === selectedId) ?? null
  const pro  = parseFloat(form.protein) || 0
  const carb = parseFloat(form.carbs)   || 0
  const fatG = parseFloat(form.fat)     || 0
  const computedCalories = Math.round(pro * 4 + carb * 4 + fatG * 9)
  const calories = form.caloriesOverride ? parseInt(form.caloriesOverride) || computedCalories : computedCalories

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('macro_targets').select('*').eq('client_id', clientId).order('created_at')
      if (data && data.length > 0) {
        setPlans(data)
        setSelectedId(data[0].id)
        loadForm(data[0])
      }
    }
    load()
  }, [clientId])

  function loadForm(t: MacroTarget) {
    setForm({ protein: String(t.protein_g), carbs: String(t.carbs_g), fat: String(t.fat_g), caloriesOverride: t.calories_override ? String(t.calories_override) : '', notes: t.notes || '' })
  }

  function selectPlan(t: MacroTarget) {
    setSelectedId(t.id)
    loadForm(t)
  }

  async function addPlan() {
    const name = newPlanName.trim() || 'New Plan'
    const { data, error } = await supabase.from('macro_targets').insert({
      client_id: clientId, coach_id: coachId, name, protein_g: 0, carbs_g: 0, fat_g: 0,
    }).select().single()
    if (error || !data) { toast.error('Failed to create plan'); return }
    setPlans(prev => [...prev, data])
    setSelectedId(data.id)
    setForm(EMPTY_FORM)
    setNewPlanName('')
    setAddingPlan(false)
    toast.success(`"${name}" created`)
  }

  async function deletePlan(id: string) {
    if (!confirm('Delete this macro plan?')) return
    await supabase.from('macro_targets').delete().eq('id', id)
    const remaining = plans.filter(p => p.id !== id)
    setPlans(remaining)
    if (selectedId === id) {
      const next = remaining[0] ?? null
      setSelectedId(next?.id ?? null)
      if (next) loadForm(next); else setForm(EMPTY_FORM)
    }
    toast.success('Plan deleted')
  }

  async function renamePlan(id: string, name: string) {
    const trimmed = name.trim()
    setEditingNameId(null)
    if (!trimmed) return
    await supabase.from('macro_targets').update({ name: trimmed }).eq('id', id)
    setPlans(prev => prev.map(p => p.id === id ? { ...p, name: trimmed } : p))
  }

  async function save() {
    if (!selectedId) return
    if (!pro && !carb && !fatG) { toast.error('Enter at least one macro'); return }
    setSaving(true)
    const update = {
      protein_g: pro, carbs_g: carb, fat_g: fatG,
      calories_override: form.caloriesOverride ? parseInt(form.caloriesOverride) || null : null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('macro_targets').update(update).eq('id', selectedId).select().single()
    setSaving(false)
    if (error || !data) { toast.error('Failed to save'); return }
    setPlans(prev => prev.map(p => p.id === selectedId ? data : p))
    toast.success('Targets saved')
  }

  if (plans.length === 0 && !addingPlan) {
    return (
      <div className="rounded-2xl p-12 text-center" style={{ background: '#111', border: '1px dashed rgba(201,168,76,0.2)' }}>
        <Flame className="w-7 h-7 mx-auto mb-3 text-zinc-700" />
        <p className="text-zinc-400 text-sm font-medium mb-1">No macro plans yet</p>
        <p className="text-zinc-600 text-xs mb-6">Create a plan for each phase — e.g. "Bulk", "Cut", "Maintenance"</p>
        <button onClick={() => setAddingPlan(true)}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
          <Plus className="w-4 h-4 inline mr-1.5" />Create first plan
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Plan tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {plans.map(plan => (
          <div key={plan.id} className="flex items-center gap-1">
            {editingNameId === plan.id ? (
              <div className="flex items-center gap-1">
                <Input value={editingName} onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') renamePlan(plan.id, editingName); if (e.key === 'Escape') setEditingNameId(null) }}
                  className="bg-zinc-900 border-zinc-700 text-white text-sm h-8 w-36" autoFocus />
                <button onClick={() => renamePlan(plan.id, editingName)} className="text-zinc-400 hover:text-white p-1"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditingNameId(null)} className="text-zinc-600 hover:text-zinc-400 p-1"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button
                onClick={() => selectPlan(plan)}
                onDoubleClick={() => { setEditingNameId(plan.id); setEditingName(plan.name) }}
                title="Double-click to rename"
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={selectedId === plan.id
                  ? { background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#000' }
                  : { background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: '#888' }}
              >{plan.name}</button>
            )}
            {selectedId === plan.id && plans.length > 1 && editingNameId !== plan.id && (
              <button onClick={() => deletePlan(plan.id)} className="text-zinc-700 hover:text-red-400 transition-colors p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {addingPlan ? (
          <div className="flex items-center gap-2">
            <Input value={newPlanName} onChange={e => setNewPlanName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addPlan(); if (e.key === 'Escape') setAddingPlan(false) }}
              placeholder='Plan name (e.g. "Cut")' className="bg-zinc-900 border-zinc-800 text-white text-sm h-9 w-44" autoFocus />
            <button onClick={addPlan} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>Add</button>
            <button onClick={() => setAddingPlan(false)} className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 bg-zinc-900">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAddingPlan(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Plus className="w-3 h-3" /> Add plan
          </button>
        )}
      </div>

      {selected && (
        <div className="rounded-2xl p-5 space-y-5" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.15)' }}>
              <Flame className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
            </div>
            <h3 className="font-semibold text-white text-sm">{selected.name} — Daily Targets</h3>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <DonutChart protein={pro} carbs={carb} fat={fatG} caloriesOverride={form.caloriesOverride ? parseInt(form.caloriesOverride) || undefined : undefined} />
            <div className="flex-1 space-y-3 min-w-48">
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <input
                  type="number"
                  value={form.caloriesOverride || computedCalories || ''}
                  onChange={e => setForm(f => ({ ...f, caloriesOverride: e.target.value }))}
                  placeholder={String(computedCalories)}
                  className="w-full text-center text-3xl font-bold bg-transparent outline-none border-none"
                  style={{ color: '#C9A84C' }}
                />
                <p className="text-zinc-500 text-xs mt-0.5">
                  calories / day
                  {form.caloriesOverride && parseInt(form.caloriesOverride) !== computedCalories && (
                    <span className="ml-1 text-zinc-600">(calc: {computedCalories})</span>
                  )}
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Protein', color: '#60a5fa', key: 'protein' as const, kcal: pro * 4 },
                  { label: 'Carbs',   color: '#34d399', key: 'carbs'   as const, kcal: carb * 4 },
                  { label: 'Fat',     color: '#f87171', key: 'fat'     as const, kcal: fatG * 9 },
                ].map(({ label, color, key, kcal }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-zinc-400 text-xs w-14">{label}</span>
                    <Input type="number" value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder="0"
                      className="flex-1 bg-zinc-900 border-zinc-800 text-white text-sm h-8" />
                    <span className="text-zinc-600 text-xs w-6">g</span>
                    <span className="text-zinc-600 text-xs w-16 text-right">{kcal > 0 ? `${Math.round(kcal)} kcal` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

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

          <div>
            <p className="text-zinc-500 text-xs mb-1.5">Notes for client (optional)</p>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Hit protein first, then fill in carbs and fat."
              rows={3} className="w-full rounded-xl px-3 py-2.5 text-sm text-white resize-none"
              style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }} />
          </div>

          <button onClick={save} disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
            {saving ? 'Saving…' : 'Save targets'}
          </button>
        </div>
      )}
    </div>
  )
}
