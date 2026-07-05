'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function HomeScreenPrompt() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const android = /android/i.test(navigator.userAgent)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    const dismissed = localStorage.getItem('homescreen-dismissed')

    if (!standalone && !dismissed && (ios || android)) {
      setIsIOS(ios)
      setShow(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem('homescreen-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="mx-4 mt-3 rounded-2xl p-4 flex items-start gap-3" style={{
      background: 'rgba(201,168,76,0.08)',
      border: '1px solid rgba(201,168,76,0.25)',
    }}>
      <img src="/logo.png" alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">Add to Home Screen</p>
        <p className="text-[#888] text-xs mt-0.5">
          {isIOS
            ? 'Tap the share button (□↑) at the bottom of Safari, then "Add to Home Screen" for quick access.'
            : 'Tap the menu (⋮) in your browser, then "Add to Home screen".'}
        </p>
      </div>
      <button onClick={dismiss} className="text-[#555] hover:text-white shrink-0 mt-0.5">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
