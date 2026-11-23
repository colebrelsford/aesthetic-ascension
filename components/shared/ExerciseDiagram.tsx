'use client'

import { PersonStanding } from 'lucide-react'

interface Props {
  imageUrl: string | null | undefined
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'w-12 h-12 rounded-lg',
  md: 'w-full aspect-[4/3] rounded-xl',
  lg: 'w-full aspect-[4/3] rounded-2xl',
}

/** Mannequin diagram for an exercise, with a neutral placeholder until one is uploaded. */
export default function ExerciseDiagram({ imageUrl, name, size = 'md', className = '' }: Props) {
  const box = `${SIZES[size]} overflow-hidden shrink-0 flex items-center justify-center ${className}`
  if (imageUrl) {
    return (
      <div className={box} style={{ background: '#f4f4f2' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={`${name} diagram`} className="w-full h-full object-contain" loading="lazy" />
      </div>
    )
  }
  return (
    <div className={box} style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(201,168,76,0.2)' }} aria-label="No diagram yet">
      <PersonStanding className={size === 'sm' ? 'w-5 h-5' : 'w-10 h-10'} style={{ color: 'rgba(201,168,76,0.35)' }} />
    </div>
  )
}
