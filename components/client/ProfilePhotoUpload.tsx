'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { toast } from 'sonner'
import { Camera, User } from 'lucide-react'
import Image from 'next/image'

interface Props {
  profile: Profile
  onUpdated: (url: string) => void
}

export default function ProfilePhotoUpload({ profile, onUpdated }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(profile.avatar_url)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${profile.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('Failed to upload photo')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('progress-photos').getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profile.id)

    setUploading(false)

    if (updateError) {
      toast.error('Failed to save photo')
      return
    }

    setPreview(publicUrl)
    onUpdated(publicUrl)
    toast.success('Profile photo updated!')
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Camera className="w-4 h-4 text-zinc-400" />
        <h3 className="font-medium text-white">Profile Photo</h3>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-700 hover:border-zinc-500 transition-colors group"
        >
          {preview ? (
            <Image src={preview} alt="Profile" fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <User className="w-8 h-8 text-zinc-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-5 h-5 text-white" />
          </div>
        </button>
        <div>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-sm text-white hover:text-zinc-300 transition-colors"
          >
            {uploading ? 'Uploading…' : 'Change photo'}
          </button>
          <p className="text-zinc-500 text-xs mt-0.5">Click your photo to update it</p>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  )
}
