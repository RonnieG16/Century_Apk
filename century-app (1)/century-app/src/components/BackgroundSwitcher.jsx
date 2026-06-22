'use client'
import { useState, useEffect } from 'react'

const backgrounds = [
  {
    id: 'violet-wave',
    name: 'Violet Wave',
    style: {
      backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.35), transparent 18%), radial-gradient(circle at 80% 10%, rgba(79, 70, 229, 0.28), transparent 18%), linear-gradient(135deg, #0a0b10 0%, #120b33 42%, #170f42 100%)',
    },
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    style: {
      backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(245, 158, 11, 0.24), transparent 18%), radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.18), transparent 22%), linear-gradient(120deg, #09090b 0%, #311b61 40%, #b45309 100%)',
    },
  },
  {
    id: 'emerald-drift',
    name: 'Emerald Drift',
    style: {
      backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(5, 150, 105, 0.28), transparent 16%), radial-gradient(circle at 75% 80%, rgba(34, 197, 94, 0.16), transparent 22%), linear-gradient(145deg, #030712 0%, #07281a 42%, #0f766e 100%)',
    },
  },
  {
    id: 'midnight-sky',
    name: 'Midnight Sky',
    style: {
      backgroundImage: 'radial-gradient(circle at 50% 15%, rgba(59, 130, 246, 0.2), transparent 18%), radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.22), transparent 18%), linear-gradient(180deg, #040814 0%, #0f172a 55%, #020617 100%)',
    },
  },
]

const pageBackgrounds = [
  {
    id: 'default',
    name: 'Lavender Mist',
    style: { backgroundColor: '#f5f3ff' },
  },
  {
    id: 'soft-cream',
    name: 'Soft Cream',
    style: { backgroundColor: '#fff7ed' },
  },
  {
    id: 'mint-frost',
    name: 'Mint Frost',
    style: { backgroundColor: '#ecfdf5' },
  },
  {
    id: 'dawn-slate',
    name: 'Dawn Slate',
    style: { backgroundColor: '#eff6ff' },
  },
  {
    id: 'midnight-haze',
    name: 'Midnight Haze',
    style: { backgroundColor: '#0f172a' },
  },
]

const PAGE_BACKGROUND_KEY = 'century-page-bg'
const PAGE_BACKGROUND_CUSTOM_KEY = 'century-page-bg-custom'

export function getBackgroundOptions() {
  return backgrounds
}

export function getPageBackgroundOptions() {
  return pageBackgrounds
}

export function getStoredBackground() {
  if (typeof window === 'undefined') return backgrounds[0]

  const storedBg = window.localStorage.getItem('century-bg')
  const storedCustom = window.localStorage.getItem('century-bg-custom')

  if (storedBg === 'custom' && storedCustom) {
    try {
      const parsed = JSON.parse(storedCustom)
      if (parsed?.style) return parsed
    } catch {
      window.localStorage.removeItem('century-bg-custom')
    }
  }

  if (storedBg) {
    const saved = backgrounds.find((item) => item.id === storedBg)
    if (saved) return saved
  }

  return backgrounds[0]
}

export function getStoredPageBackground() {
  if (typeof window === 'undefined') return pageBackgrounds[0]

  const storedBg = window.localStorage.getItem(PAGE_BACKGROUND_KEY)
  const storedCustom = window.localStorage.getItem(PAGE_BACKGROUND_CUSTOM_KEY)

  if (storedBg === 'custom' && storedCustom) {
    try {
      const parsed = JSON.parse(storedCustom)
      if (parsed?.style?.backgroundColor) return parsed
    } catch {
      window.localStorage.removeItem(PAGE_BACKGROUND_CUSTOM_KEY)
    }
  }

  if (storedBg) {
    const saved = pageBackgrounds.find((item) => item.id === storedBg)
    if (saved) return saved
  }

  return pageBackgrounds[0]
}

export function persistBackground(next) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('century-bg', next.id)
  if (next.id === 'custom') {
    window.localStorage.setItem('century-bg-custom', JSON.stringify(next))
  }
}

export function persistPageBackground(next) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PAGE_BACKGROUND_KEY, next.id)
  if (next.id === 'custom') {
    window.localStorage.setItem(PAGE_BACKGROUND_CUSTOM_KEY, JSON.stringify(next))
  }
}

export function clearCustomBackground() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem('century-bg-custom')
  window.localStorage.setItem('century-bg', backgrounds[0].id)
}

export function clearCustomPageBackground() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(PAGE_BACKGROUND_CUSTOM_KEY)
  window.localStorage.setItem(PAGE_BACKGROUND_KEY, pageBackgrounds[0].id)
}

const COMPANY_LOGO_KEY = 'century-company-logo'

export function getStoredCompanyLogo() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(COMPANY_LOGO_KEY)
}

export function persistCompanyLogo(src) {
  if (typeof window === 'undefined') return
  if (src) window.localStorage.setItem(COMPANY_LOGO_KEY, src)
}

export function clearCompanyLogo() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(COMPANY_LOGO_KEY)
}

const MARKETING_ITEMS_KEY = 'century-marketing-items'
const FOR_YOU_VIDEOS_KEY = 'century-for-you-videos'

export function getStoredMarketingItems() {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(MARKETING_ITEMS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) || []
  } catch {
    window.localStorage.removeItem(MARKETING_ITEMS_KEY)
    return []
  }
}

export function persistMarketingItems(items) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MARKETING_ITEMS_KEY, JSON.stringify(items || []))
}

export function clearMarketingItems() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(MARKETING_ITEMS_KEY)
}

export function getStoredForYouVideos() {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(FOR_YOU_VIDEOS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) || []
  } catch {
    window.localStorage.removeItem(FOR_YOU_VIDEOS_KEY)
    return []
  }
}

export function persistForYouVideos(items) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(FOR_YOU_VIDEOS_KEY, JSON.stringify(items || []))
}

export function clearForYouVideos() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(FOR_YOU_VIDEOS_KEY)
}

export default function BackgroundSwitcher({ background }) {
  const [active, setActive] = useState(background || getStoredBackground())

  useEffect(() => {
    if (!background) return
    setActive(background)
  }, [background])

  return (
    <div className="background-frame">
      <div className="moving-bg" style={active.style} />
      <div className="background-overlay" />
    </div>
  )
}
