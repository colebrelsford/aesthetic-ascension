'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { StickyNote, Save } from 'lucide-react'

interface Props {
  clientId: string
}

export default function CoachNotes({ clientId }: Props) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('coach_notes')
      .select('content')
      .eq('client_id', clientId)
      .single()
      .then(({ data }) => {
        if (data) setContent(data.content || '')
        setLoaded(true)
      })
  }, [clientId])

  async function save() {
    setSaving(true)
    const { error } = await supabase
      .from('coach_notes')
      .upsert({ client_id: clientId, content, updated_at: new Date().toISOString() }, { onConflict: 'client_id' })
    setSaving(false)
    if (error) { toast.error('Failed to save notes'); return }
    toast.success('Notes saved')
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-zinc-400" />
          <h3 className="font-medium text-white text-sm">Private Coach Notes</h3>
          <span className="text-zinc-600 text-xs">(only you can see this)</span>
        </div>
        <Button
          size="sm"
          onClick={save}
          disabled={saving || !loaded}
          className="bg-white text-black hover:bg-zinc-200 h-7 px-3 text-xs"
        >
          <Save className="w-3 h-3 mr-1" />
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Injury notes, tendencies, contest prep details, things to watch for..."
        className="w-full bg-zinc-900 text-zinc-200 text-sm p-4 min-h-[180px] resize-none focus:outline-none placeholder:text-zinc-600"
      />
    </div>
  )
}
