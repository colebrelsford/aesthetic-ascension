'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Upload, X } from 'lucide-react'
import Image from 'next/image'

interface Props {
  clientId: string
}

function RatingSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label className="text-zinc-300 text-sm">{label}</Label>
        <span className="text-white font-medium text-sm">{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-white"
      />
    </div>
  )
}

export default function WeeklyCheckinForm({ clientId }: Props) {
  const [energy, setEnergy] = useState(7)
  const [sleep, setSleep] = useState(7)
  const [stress, setStress] = useState(5)
  const [nutritionAdherence, setNutritionAdherence] = useState(8)
  const [trainingAdherence, setTrainingAdherence] = useState(8)
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const newFiles = [...photos, ...files].slice(0, 5)
    setPhotos(newFiles)
    const newPreviews = newFiles.map(f => URL.createObjectURL(f))
    setPreviews(newPreviews)
  }

  function removePhoto(index: number) {
    const newFiles = photos.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    setPhotos(newFiles)
    setPreviews(newPreviews)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const { data: checkin, error: checkinError } = await supabase
      .from('weekly_checkins')
      .upsert({
        client_id: clientId,
        week_start: weekStartStr,
        energy_level: energy,
        sleep_quality: sleep,
        stress_level: stress,
        adherence_nutrition: nutritionAdherence,
        adherence_training: trainingAdherence,
        notes,
      }, { onConflict: 'client_id,week_start' })
      .select()
      .single()

    if (checkinError) {
      toast.error('Failed to submit check-in')
      setLoading(false)
      return
    }

    for (const photo of photos) {
      const ext = photo.name.split('.').pop()
      const fileName = `${clientId}/${checkin.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, photo)

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('progress-photos').getPublicUrl(fileName)
        await supabase.from('progress_photos').insert({
          client_id: clientId,
          checkin_id: checkin.id,
          photo_url: publicUrl,
          taken_at: new Date().toISOString(),
        })
      }
    }

    toast.success('Check-in submitted!')
    setNotes('')
    setPhotos([])
    setPreviews([])
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      <div>
        <h3 className="font-medium text-white mb-4">Weekly Check-in</h3>
        <div className="space-y-4">
          <RatingSlider label="Energy Level" value={energy} onChange={setEnergy} />
          <RatingSlider label="Sleep Quality" value={sleep} onChange={setSleep} />
          <RatingSlider label="Stress Level" value={stress} onChange={setStress} />
          <RatingSlider label="Nutrition Adherence" value={nutritionAdherence} onChange={setNutritionAdherence} />
          <RatingSlider label="Training Adherence" value={trainingAdherence} onChange={setTrainingAdherence} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-zinc-300">Notes for your coach</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did the week go? Any issues, wins, or questions?"
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[100px]"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-zinc-300">Progress Photos (up to 5)</Label>
        {previews.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {previews.map((src, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-700">
                <Image src={src} alt={`Photo ${i + 1}`} fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 hover:bg-black"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 5 && (
          <label className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-white transition-colors text-sm border border-dashed border-zinc-700 rounded-lg p-3 hover:border-zinc-500">
            <Upload className="w-4 h-4" />
            <span>Add photos</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
          </label>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black hover:bg-zinc-200 font-medium"
      >
        {loading ? 'Submitting…' : 'Submit Check-in'}
      </Button>
    </form>
  )
}
