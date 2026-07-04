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

function OpenQuestion({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-200 text-sm font-medium">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[90px] resize-none"
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
  const [dietAdherence, setDietAdherence] = useState('')
  const [cardioAdherence, setCardioAdherence] = useState('')
  const [threeWins, setThreeWins] = useState('')
  const [threeStruggles, setThreeStruggles] = useState('')
  const [couldDoBetter, setCouldDoBetter] = useState('')
  const [progressionNotes, setProgressionNotes] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const newFiles = [...photos, ...files].slice(0, 5)
    setPhotos(newFiles)
    setPreviews(newFiles.map(f => URL.createObjectURL(f)))
  }

  function removePhoto(index: number) {
    setPhotos(photos.filter((_, i) => i !== index))
    setPreviews(previews.filter((_, i) => i !== index))
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
        diet_adherence: dietAdherence,
        cardio_adherence: cardioAdherence,
        three_wins: threeWins,
        three_struggles: threeStruggles,
        could_do_better: couldDoBetter,
        progression_notes: progressionNotes,
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
    setDietAdherence('')
    setCardioAdherence('')
    setThreeWins('')
    setThreeStruggles('')
    setCouldDoBetter('')
    setProgressionNotes('')
    setPhotos([])
    setPreviews([])
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      <h3 className="font-medium text-white">Weekly Check-in</h3>

      {/* Ratings */}
      <div className="space-y-4">
        <p className="text-zinc-400 text-xs uppercase tracking-wider">Rate your week</p>
        <RatingSlider label="Energy Level" value={energy} onChange={setEnergy} />
        <RatingSlider label="Sleep Quality" value={sleep} onChange={setSleep} />
        <RatingSlider label="Stress Level" value={stress} onChange={setStress} />
        <RatingSlider label="Nutrition Adherence" value={nutritionAdherence} onChange={setNutritionAdherence} />
        <RatingSlider label="Training Adherence" value={trainingAdherence} onChange={setTrainingAdherence} />
      </div>

      {/* Open-ended questions */}
      <div className="space-y-4">
        <p className="text-zinc-400 text-xs uppercase tracking-wider">Weekly questions</p>

        <OpenQuestion
          label="Did you stick to the diet? If not, explain in detail."
          value={dietAdherence}
          onChange={setDietAdherence}
          placeholder="Be honest and specific..."
        />
        <OpenQuestion
          label="How was cardio adherence this week? Be specific."
          value={cardioAdherence}
          onChange={setCardioAdherence}
          placeholder="Days completed, duration, intensity..."
        />
        <OpenQuestion
          label="What are 3 wins you had this week?"
          value={threeWins}
          onChange={setThreeWins}
          placeholder="1. 2. 3."
        />
        <OpenQuestion
          label="What are 3 struggles you had this week?"
          value={threeStruggles}
          onChange={setThreeStruggles}
          placeholder="1. 2. 3."
        />
        <OpenQuestion
          label="What do you feel you could have done better this week?"
          value={couldDoBetter}
          onChange={setCouldDoBetter}
          placeholder="Be honest with yourself..."
        />
        <OpenQuestion
          label="How was progression this week?"
          value={progressionNotes}
          onChange={setProgressionNotes}
          placeholder="Strength gains, PRs, how weights felt..."
        />
      </div>

      {/* Photos */}
      <div className="space-y-3">
        <p className="text-zinc-400 text-xs uppercase tracking-wider">Progress photos (up to 5)</p>
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
