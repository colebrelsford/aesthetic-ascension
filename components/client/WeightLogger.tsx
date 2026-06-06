'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WeightLog } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Scale } from 'lucide-react'

interface Props {
  clientId: string
  onLogged: (log: WeightLog) => void
}

export default function WeightLogger({ clientId, onLogged }: Props) {
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!weight) return
    setLoading(true)

    const { data, error } = await supabase
      .from('weight_logs')
      .upsert({ client_id: clientId, date, weight_lbs: parseFloat(weight) }, { onConflict: 'client_id,date' })
      .select()
      .single()

    setLoading(false)

    if (error) {
      toast.error('Failed to log weight')
      return
    }

    toast.success('Weight logged!')
    onLogged(data)
    setWeight('')
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="w-4 h-4 text-zinc-400" />
        <h3 className="font-medium text-white">Log Today&apos;s Weight</h3>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-zinc-400 text-xs">Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-zinc-400 text-xs">Weight (lbs)</Label>
          <Input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="185.0"
            className="bg-zinc-800 border-zinc-700 text-white w-32"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !weight}
          className="bg-white text-black hover:bg-zinc-200"
        >
          {loading ? 'Saving…' : 'Log'}
        </Button>
      </form>
    </div>
  )
}
