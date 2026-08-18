'use client'

import { Scale, Flame, Droplets, ShoppingCart, CheckCircle2 } from 'lucide-react'

const TIPS = [
  {
    icon: Scale,
    title: 'Weigh your food',
    body: 'Use a kitchen food scale and weigh everything in grams. Volume measurements (cups, tablespoons) are inaccurate enough to throw off your macros significantly.',
  },
  {
    icon: Flame,
    title: 'Log before you eat',
    body: 'Build the habit of logging your meal in MyNetDiary before you eat it. It keeps you accountable and lets you adjust portions before it\'s too late.',
  },
  {
    icon: CheckCircle2,
    title: 'Low-cal sauces & condiments are fine',
    body: 'Anything under 15 calories per serving (hot sauce, mustard, most sugar-free syrups, vinegar, soy sauce in small amounts) doesn\'t need to be tracked obsessively. Just don\'t go crazy.',
  },
  {
    icon: Droplets,
    title: 'Use 0-calorie cooking spray',
    body: 'Swap cooking oils for a 0-calorie cooking spray (like PAM or any store brand). A tablespoon of olive oil is ~120 calories — those add up fast and aren\'t worth the hit to your macros.',
  },
  {
    icon: ShoppingCart,
    title: 'Use the barcode scanner',
    body: 'For packaged foods, scan the barcode in MyNetDiary instead of searching manually. It pulls the exact product with the correct serving size and macros.',
  },
]

export default function TrackingTips() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="font-semibold text-white text-sm">Tracking guidelines</h3>
        <p className="text-zinc-500 text-xs mt-0.5">General rules to keep your nutrition on point</p>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {TIPS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-4 px-5 py-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'rgba(201,168,76,0.1)' }}>
              <Icon className="w-4 h-4" style={{ color: '#C9A84C' }} />
            </div>
            <div>
              <p className="text-zinc-200 text-sm font-medium">{title}</p>
              <p className="text-zinc-500 text-xs leading-relaxed mt-0.5">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
