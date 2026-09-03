'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Upload, X, Camera } from 'lucide-react'
import Image from 'next/image'

interface Props {
  clientId: string
}

function RatingSlider({ label, sublabel, value, onChange }: { label: string; sublabel?: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <Label className="text-zinc-300 text-sm">{label}</Label>
          {sublabel && <p className="text-zinc-500 text-xs mt-0.5">{sublabel}</p>}
        </div>
        <span className="text-white font-medium text-sm">{value}/10</span>
      </div>
      <input
        type="range" min={1} max={10} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-white"
      />
    </div>
  )
}

function OpenQuestion({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-200 text-sm font-medium">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[90px] resize-none" />
    </div>
  )
}

function NumberField({ label, sublabel, value, onChange, placeholder, unit }: {
  label: string; sublabel?: string; value: string; onChange: (v: string) => void; placeholder: string; unit?: string
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <Label className="text-zinc-200 text-sm font-medium">{label}</Label>
        {sublabel && <p className="text-zinc-500 text-xs mt-0.5">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 w-28" />
        {unit && <span className="text-zinc-500 text-sm">{unit}</span>}
      </div>
    </div>
  )
}

export default function WeeklyCheckinForm({ clientId }: Props) {
  // Ratings
  const [energy, setEnergy] = useState(7)
  const [sleep, setSleep] = useState(7)
  const [stress, setStress] = useState(5)
  const [nutritionAdherence, setNutritionAdherence] = useState(8)
  const [trainingAdherence, setTrainingAdherence] = useState(8)
  // Numbers
  const [sleepHours, setSleepHours] = useState('')
  const [avgDailySteps, setAvgDailySteps] = useState('')
  const [waterIntake, setWaterIntake] = useState('')
  const [mealsMissed, setMealsMissed] = useState('')
  const [offPlanMeals, setOffPlanMeals] = useState('')
  // Text
  const [dietAdherence, setDietAdherence] = useState('')
  const [cardioAdherence, setCardioAdherence] = useState('')
  const [digestionNotes, setDigestionNotes] = useState('')
  const [threeWins, setThreeWins] = useState('')
  const [threeStruggles, setThreeStruggles] = useState('')
  const [couldDoBetter, setCouldDoBetter] = useState('')
  const [progressionNotes, setProgressionNotes] = useState('')
  const [anythingElse, setAnythingElse] = useState('')
  // Photos
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showPhotoGuide, setShowPhotoGuide] = useState(false)
  const supabase = createClient()

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const newFiles = [...photos, ...files].slice(0, 10)
    setPhotos(newFiles)
    setPreviews(newFiles.map(f => URL.createObjectURL(f)))
  }

  async function compressPhoto(file: File): Promise<File> {
    return new Promise(resolve => {
      const img = new window.Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 1200
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX }
          else { width = Math.round((width * MAX) / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => {
          resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }) : file)
        }, 'image/jpeg', 0.82)
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  function removePhoto(index: number) {
    setPhotos(photos.filter((_, i) => i !== index))
    setPreviews(previews.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Use local date to avoid UTC timezone shifting the week_start day
    const now = new Date()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`

    const { data: checkin, error: checkinError } = await supabase
      .from('weekly_checkins')
      .upsert({
        client_id: clientId,
        week_start: weekStartStr,
        energy_level: energy,
        sleep_quality: sleep,
        sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
        stress_level: stress,
        adherence_nutrition: nutritionAdherence,
        adherence_training: trainingAdherence,
        avg_daily_steps: avgDailySteps ? parseInt(avgDailySteps) : null,
        water_intake_oz: waterIntake ? Math.round(parseFloat(waterIntake) * 128) : null,
        meals_missed: mealsMissed ? parseInt(mealsMissed) : null,
        off_plan_meals: offPlanMeals ? parseInt(offPlanMeals) : null,
        diet_adherence: dietAdherence.trim() || null,
        cardio_adherence: cardioAdherence.trim() || null,
        digestion_notes: digestionNotes.trim() || null,
        three_wins: threeWins.trim() || null,
        three_struggles: threeStruggles.trim() || null,
        could_do_better: couldDoBetter.trim() || null,
        progression_notes: progressionNotes.trim() || null,
        anything_else: anythingElse.trim() || null,
      }, { onConflict: 'client_id,week_start' })
      .select().single()

    if (checkinError) {
      toast.error('Failed to submit check-in')
      setLoading(false)
      return
    }

    for (const photo of photos) {
      const compressed = await compressPhoto(photo)
      const fileName = `${clientId}/${checkin.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('progress-photos').upload(fileName, compressed, { contentType: 'image/jpeg' })
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('progress-photos').getPublicUrl(fileName)
        await supabase.from('progress_photos').insert({
          client_id: clientId, checkin_id: checkin.id, photo_url: publicUrl, taken_at: new Date().toISOString(),
        })
      }
    }

    toast.success('Check-in submitted!')
    setSleepHours(''); setAvgDailySteps(''); setWaterIntake(''); setMealsMissed(''); setOffPlanMeals('')
    setDietAdherence(''); setCardioAdherence(''); setDigestionNotes(''); setThreeWins('')
    setThreeStruggles(''); setCouldDoBetter(''); setProgressionNotes(''); setAnythingElse('')
    setPhotos([]); setPreviews([])
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-8">
      <h3 className="font-medium text-white">Weekly Check-in</h3>

      {/* ── Ratings ── */}
      <div className="space-y-4">
        <p className="text-zinc-400 text-xs uppercase tracking-wider">Rate your week (1–10)</p>
        <RatingSlider label="Energy Level" sublabel="How was your overall energy day to day?" value={energy} onChange={setEnergy} />
        <RatingSlider label="Sleep Quality" sublabel="How restful was your sleep?" value={sleep} onChange={setSleep} />
        <RatingSlider label="Stress Level" sublabel="10 = extremely stressed" value={stress} onChange={setStress} />
        <RatingSlider label="Nutrition Adherence" sublabel="How closely did you follow your plan?" value={nutritionAdherence} onChange={setNutritionAdherence} />
        <RatingSlider label="Training Adherence" sublabel="Did you complete all sessions?" value={trainingAdherence} onChange={setTrainingAdherence} />
      </div>

      {/* ── Numbers ── */}
      <div className="space-y-4">
        <p className="text-zinc-400 text-xs uppercase tracking-wider">Weekly numbers</p>
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Avg sleep per night" value={sleepHours} onChange={setSleepHours} placeholder="7.5" unit="hrs" />
          <NumberField label="Avg daily steps" sublabel="Estimate if not tracked" value={avgDailySteps} onChange={setAvgDailySteps} placeholder="8000" />
          <NumberField label="Water intake" sublabel="Daily average" value={waterIntake} onChange={setWaterIntake} placeholder="0.75" unit="gal" />
          <NumberField label="Meals missed" sublabel="Planned meals skipped" value={mealsMissed} onChange={setMealsMissed} placeholder="0" />
          <NumberField label="Off-plan meals" sublabel="Untracked / eating out" value={offPlanMeals} onChange={setOffPlanMeals} placeholder="0" />
        </div>
      </div>

      {/* ── Open-ended ── */}
      <div className="space-y-4">
        <p className="text-zinc-400 text-xs uppercase tracking-wider">Weekly questions</p>
        <OpenQuestion label="Did you stick to the diet? If not, explain in detail." value={dietAdherence} onChange={setDietAdherence} placeholder="Be honest and specific..." />
        <OpenQuestion label="How was cardio adherence this week? Be specific." value={cardioAdherence} onChange={setCardioAdherence} placeholder="Days completed, duration, intensity..." />
        <OpenQuestion label="How was digestion this week?" value={digestionNotes} onChange={setDigestionNotes} placeholder="Bloating, constipation, anything off?" />
        <OpenQuestion label="What are 3 wins you had this week?" value={threeWins} onChange={setThreeWins} placeholder="1. &#10;2. &#10;3." />
        <OpenQuestion label="What are 3 struggles you had this week?" value={threeStruggles} onChange={setThreeStruggles} placeholder="1. &#10;2. &#10;3." />
        <OpenQuestion label="What could you have done better?" value={couldDoBetter} onChange={setCouldDoBetter} placeholder="Be honest with yourself..." />
        <OpenQuestion label="How was progression in the gym this week?" value={progressionNotes} onChange={setProgressionNotes} placeholder="Strength gains, PRs, how weights felt..." />
        <OpenQuestion label="Anything else your coach should know?" value={anythingElse} onChange={setAnythingElse} placeholder="Life stuff, schedule changes, anything on your mind..." />
      </div>

      {/* ── Photos ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-zinc-400 text-xs uppercase tracking-wider">Progress photos (up to 10)</p>
          <button type="button" onClick={() => setShowPhotoGuide(!showPhotoGuide)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <Camera className="w-3.5 h-3.5" />
            Photo tips
          </button>
        </div>

        {showPhotoGuide && (
          <div className="rounded-xl p-4 space-y-2 text-xs text-zinc-400" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
            <p className="font-semibold" style={{ color: '#C9A84C' }}>How to take a good progress photo</p>
            <ul className="space-y-1.5 list-none">
              <li>📸 <span className="text-zinc-300">Use your rear camera</span> — it's higher quality</li>
              <li>🕗 <span className="text-zinc-300">Take them fasted, first thing in the morning</span> — same time every week</li>
              <li>🖤 <span className="text-zinc-300">Dark background</span> — turn lights off behind you, or use a dark wall</li>
              <li>📐 <span className="text-zinc-300">Camera at waist height</span>, full head-to-toe in frame</li>
              <li>💡 <span className="text-zinc-300">Stand 6 feet in front of a light source</span>, not directly under overhead lighting</li>
              <li>🚪 <span className="text-zinc-300">Bathroom doorway trick:</span> bathroom lights on, room behind you dark</li>
            </ul>
          </div>
        )}

        {previews.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {previews.map((src, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-700">
                <Image src={src} alt={`Photo ${i + 1}`} fill className="object-cover" />
                <button type="button" onClick={() => removePhoto(i)}
                  className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 hover:bg-black">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 10 && (
          <label className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-white transition-colors text-sm border border-dashed border-zinc-700 rounded-lg p-3 hover:border-zinc-500">
            <Upload className="w-4 h-4" />
            <span>Add photos</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
          </label>
        )}
      </div>

      <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
        <span className="text-base shrink-0">📏</span>
        <p className="text-xs leading-relaxed" style={{ color: '#C9A84C' }}>
          <span className="font-semibold">Don't forget:</span> log your waist measurement (and any other measurements) in the <span className="font-semibold">Measurements</span> tab before or after submitting your check-in.
        </p>
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-white text-black hover:bg-zinc-200 font-medium">
        {loading ? 'Submitting…' : 'Submit Check-in'}
      </Button>
    </form>
  )
}
