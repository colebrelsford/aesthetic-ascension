'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, Pencil, Check, X, Pill } from 'lucide-react'

interface Props {
  clientId: string
  coachId: string
}

interface Supplement {
  id: string
  name: string
  brand: string | null
  dosage: string | null
  timing: string
  frequency: string
  notes: string | null
  display_order: number
}

const TIMINGS = ['AM', 'With food', 'Pre-workout', 'Post-workout', 'PM', 'Before bed', 'As needed']
const FREQUENCIES = ['Daily', '6x/week', '5x/week', '3x/week (M/W/F)', '2x/week', 'Weekly', 'Cycle', 'As needed']
const TIMING_ORDER = Object.fromEntries(TIMINGS.map((t, i) => [t, i]))

const EMPTY_FORM = { name: '', brand: '', dosage: '', timing: 'AM', frequency: 'Daily', notes: '' }

export default function SupplementBuilder({ clientId, coachId }: Props) {
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
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

  function field(key: keyof typeof EMPTY_FORM, value: string, setter: (f: typeof EMPTY_FORM) => void, cur: typeof EMPTY_FORM) {
    setter({ ...cur, [key]: value })
  }

  async function addSupplement() {
    if (!form.name.trim()) { toast.error('Enter a supplement name'); return }
    setSaving(true)
    const { data, error } = await supabase.from('client_supplements').insert({
      client_id: clientId,
      coach_id: coachId,
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      dosage: form.dosage.trim() || null,
      timing: form.timing,
      frequency: form.frequency,
      notes: form.notes.trim() || null,
      display_order: supplements.length,
    }).select().single()
    setSaving(false)
    if (error || !data) { toast.error('Failed to add'); return }
    setSupplements(prev => [...prev, data])
    setForm(EMPTY_FORM)
    setAdding(false)
    toast.success(`${data.name} added`)
  }

  async function saveEdit(id: string) {
    if (!editForm.name.trim()) return
    const update = {
      name: editForm.name.trim(),
      brand: editForm.brand.trim() || null,
      dosage: editForm.dosage.trim() || null,
      timing: editForm.timing,
      frequency: editForm.frequency,
      notes: editForm.notes.trim() || null,
    }
    await supabase.from('client_supplements').update(update).eq('id', id)
    setSupplements(prev => prev.map(s => s.id === id ? { ...s, ...update } : s))
    setEditingId(null)
    toast.success('Updated')
  }

  async function deleteSupplement(id: string, name: string) {
    if (!confirm(`Remove ${name}?`)) return
    await supabase.from('client_supplements').delete().eq('id', id)
    setSupplements(prev => prev.filter(s => s.id !== id))
    toast.success('Removed')
  }

  function openEdit(s: Supplement) {
    setEditingId(s.id)
    setEditForm({ name: s.name, brand: s.brand || '', dosage: s.dosage || '', timing: s.timing, frequency: s.frequency, notes: s.notes || '' })
  }

  const grouped = TIMINGS.reduce<Record<string, Supplement[]>>((acc, t) => {
    acc[t] = supplements.filter(s => s.timing === t)
    return acc
  }, {})

  const cardStyle = { background: '#111', border: '1px solid rgba(255,255,255,0.07)' }
  const inputCls = 'bg-zinc-900 border-zinc-800 text-white text-sm h-8'
  const selectCls = 'bg-zinc-900 border border-zinc-800 text-white text-sm h-8 rounded-lg px-2 outline-none'

  if (loading) return null

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-black"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}
        >
          <Plus className="w-4 h-4" /> Add supplement
        </button>
      )}

      {/* Add form */}
      {adding && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.25)' }}>
          <p className="text-white font-semibold text-sm">New supplement</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-zinc-500 text-xs">Name *</p>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Creatine" className={inputCls} autoFocus />
            </div>
            <div className="space-y-1">
              <p className="text-zinc-500 text-xs">Brand</p>
              <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                placeholder="e.g. Nutricost" className={inputCls} />
            </div>
            <div className="space-y-1">
              <p className="text-zinc-500 text-xs">Dosage</p>
              <Input value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))}
                placeholder="e.g. 5g, 5000IU, 10 units" className={inputCls} />
            </div>
            <div className="space-y-1">
              <p className="text-zinc-500 text-xs">Timing</p>
              <select value={form.timing} onChange={e => setForm(f => ({ ...f, timing: e.target.value }))} className={selectCls}>
                {TIMINGS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-zinc-500 text-xs">Frequency</p>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} className={selectCls}>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-zinc-500 text-xs">Notes</p>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. With water, fasted" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addSupplement} disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-black disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}>
              {saving ? 'Adding…' : 'Add'}
            </button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_FORM) }}
              className="px-4 py-2 rounded-xl text-xs text-zinc-500 bg-zinc-900">Cancel</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {supplements.length === 0 && !adding && (
        <div className="rounded-2xl p-10 text-center" style={cardStyle}>
          <Pill className="w-6 h-6 mx-auto mb-2 text-zinc-700" />
          <p className="text-zinc-500 text-sm">No supplements added yet.</p>
          <p className="text-zinc-700 text-xs mt-1">Click "Add supplement" to build this client's protocol.</p>
        </div>
      )}

      {/* Grouped lists */}
      {TIMINGS.map(timing => {
        const items = grouped[timing]
        if (!items || items.length === 0) return null
        return (
          <div key={timing} className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.1)' }}>
                <Pill className="w-3 h-3" style={{ color: '#C9A84C' }} />
              </div>
              <span className="text-white font-semibold text-sm">{timing}</span>
              <span className="text-zinc-700 text-xs ml-auto">{items.length} supplement{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {items.map(s => (
                <div key={s.id} className="px-4 py-3">
                  {editingId === s.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div><p className="text-zinc-500 text-xs mb-1">Name</p>
                          <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputCls} autoFocus /></div>
                        <div><p className="text-zinc-500 text-xs mb-1">Brand</p>
                          <Input value={editForm.brand} onChange={e => setEditForm(f => ({ ...f, brand: e.target.value }))} className={inputCls} /></div>
                        <div><p className="text-zinc-500 text-xs mb-1">Dosage</p>
                          <Input value={editForm.dosage} onChange={e => setEditForm(f => ({ ...f, dosage: e.target.value }))} className={inputCls} /></div>
                        <div><p className="text-zinc-500 text-xs mb-1">Timing</p>
                          <select value={editForm.timing} onChange={e => setEditForm(f => ({ ...f, timing: e.target.value }))} className={selectCls}>
                            {TIMINGS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select></div>
                        <div><p className="text-zinc-500 text-xs mb-1">Frequency</p>
                          <select value={editForm.frequency} onChange={e => setEditForm(f => ({ ...f, frequency: e.target.value }))} className={selectCls}>
                            {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                          </select></div>
                        <div><p className="text-zinc-500 text-xs mb-1">Notes</p>
                          <Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(s.id); if (e.key === 'Escape') setEditingId(null) }}
                            className={inputCls} /></div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(s.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-black"
                          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)' }}><Check className="w-3 h-3" /> Save</button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 bg-zinc-900">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-zinc-100 text-sm font-medium">{s.name}</span>
                          {s.dosage && <span className="text-zinc-300 text-sm font-semibold" style={{ color: '#C9A84C' }}>{s.dosage}</span>}
                          {s.brand && <span className="text-zinc-500 text-xs">· {s.brand}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-zinc-600 text-xs">{s.frequency}</span>
                          {s.notes && <span className="text-zinc-600 text-xs">· {s.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(s)} className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-800">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteSupplement(s.id, s.name)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
