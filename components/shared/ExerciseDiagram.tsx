'use client'

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

/** Exercise picture, if one exists. Renders nothing otherwise (the library is text-only for now). */
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
  return null
}
