'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, X, Volume2, VolumeX, ArrowRight, Download, Bookmark, CheckCircle } from 'lucide-react'
import FeedItem from './FeedItem'
import VendorProfileModal from './VendorProfileModal'
import { getFeedProducts, searchAll } from '@/lib/supabase'
import { getStoredMarketingItems, getStoredForYouVideos } from '@/components/BackgroundSwitcher'

export default function Feed({ user, onRequireAuth, onActiveVendorChange }) {
  const [tab, setTab] = useState('foryou')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [marketingItems, setMarketingItems] = useState([])
  const [marketing, setMarketing] = useState(null)
  const [marketingMuted, setMarketingMuted] = useState(true)
  const [forYouVideos, setForYouVideos] = useState([])
  const [showMarketingOnce, setShowMarketingOnce] = useState(false)
  const containerRef = useRef(null)
  const itemRefs = useRef([])
  const marketingVideoRef = useRef(null)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const data = await getFeedProducts(tab, user?.id)
    setProducts(data)
    setLoading(false)
  }, [tab, user?.id])

  useEffect(() => { loadProducts() }, [loadProducts])

  useEffect(() => {
    const storedMarketingItems = getStoredMarketingItems()
    const storedForYouVideos = getStoredForYouVideos()
    setMarketingItems(storedMarketingItems)
    setMarketing(storedMarketingItems[storedMarketingItems.length - 1] || null)
    setForYouVideos(storedForYouVideos)
    // show marketing/promotional content only if account creation requested it
    try {
      const flag = typeof window !== 'undefined' && window.localStorage.getItem('century-show-marketing')
      if (flag) {
        setShowMarketingOnce(true)
        try { window.localStorage.removeItem('century-show-marketing') } catch {}
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!marketingVideoRef.current) return
    marketingVideoRef.current.muted = marketingMuted
    if (!marketingMuted) {
      marketingVideoRef.current.play().catch(() => {})
    }
  }, [marketingMuted])

  const feedItems = useMemo(() => {
    const productItems = products
    if (tab !== 'foryou' || forYouVideos.length === 0) return productItems

    const localForYou = forYouVideos.map((video) => ({
      id: `for-you-${video.id}`,
      media_type: 'video',
      media_urls: [video.video],
      title: video.title,
      description: 'Curated For You',
      vendors: { store_name: 'For You' },
      isForYou: true,
    }))

    return shuffleArray([...productItems, ...localForYou])
  }, [products, forYouVideos, tab])

  function shuffleArray(items) {
    return [...items].sort(() => Math.random() - 0.5)
  }

  // IntersectionObserver for active item
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = itemRefs.current.indexOf(entry.target)
            if (idx !== -1) setActiveIndex(idx)
          }
        })
      },
      { threshold: 0.6 }
    )
    itemRefs.current.forEach((el) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [feedItems])

  // notify parent about currently active vendor (for floating actions)
  useEffect(() => {
    if (!onActiveVendorChange) return
    const current = feedItems[activeIndex]
    const vendor = current?.vendors || null
    onActiveVendorChange(vendor)
  }, [activeIndex, feedItems, onActiveVendorChange])

  async function handleSearch(q) {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults(null); return }
    const results = await searchAll(q)
    setSearchResults(results)
  }

  function handleVendorClick(vendor) {
    if (!vendor) return
    setSelectedVendor(vendor)
  }

  function scrollToIndex(idx) {
    if (!itemRefs.current[idx]) return
    itemRefs.current[idx].scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveIndex(idx)
  }

  if (loading) return (
    <div className="h-dvh bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white/60 text-sm">Loading feed...</p>
      </div>
    </div>
  )

  return (
    <div className="relative h-dvh bg-black">
      {/* ── Top bar ── */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center gap-3 px-4 pt-12 pb-3">
        {!searchOpen ? (
          <>
            <div className="flex gap-6 flex-1">
              {['following', 'foryou'].map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`text-base font-semibold pb-1 transition ${tab === t ? 'text-white border-b-2 border-white' : 'text-white/50'}`}>
                  {t === 'foryou' ? 'For You' : 'Following'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSearchOpen(true)}
              className="bg-black/40 border border-white/20 text-white/60 rounded-full px-4 py-1.5 text-sm flex items-center gap-2">
              <Search size={14} /> Search
            </button>
              <button onClick={() => setAutoScrollEnabled((s) => !s)}
                className={`ml-2 text-sm px-3 py-1 rounded-full ${autoScrollEnabled ? 'bg-white/10 text-white' : 'bg-black/30 text-white/60'}`}>
                {autoScrollEnabled ? 'Auto-scroll: On' : 'Auto-scroll: Off'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 flex items-center bg-white rounded-xl px-3 py-2">
              <Search size={16} className="text-gray-400 mr-2" />
              <input autoFocus className="flex-1 outline-none text-sm text-gray-800 bg-transparent"
                placeholder="Search vendors or products..."
                value={searchQuery} onChange={(e) => handleSearch(e.target.value)} />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults(null) }}>
                  <X size={14} className="text-gray-400" />
                </button>
              )}
            </div>
            <button onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults(null) }}
              className="text-white text-sm">Cancel</button>
          </div>
        )}
      </div>

      {/* ── Search results overlay ── */}
      {searchResults && (
        <div className="absolute inset-x-0 top-24 bottom-16 z-25 bg-black/75 backdrop-blur-xl overflow-y-auto px-4 py-3">
          {searchResults.vendors?.length > 0 && (
            <div className="mb-4">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Vendors</p>
              {searchResults.vendors.map((v) => (
                <button key={v.id} onClick={() => { setSelectedVendor(v); setSearchOpen(false); setSearchResults(null) }}
                  className="w-full flex items-center gap-3 py-3 border-b border-white/10 text-left">
                  <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold">
                    {v.store_name[0]}
                  </div>
                  <div>
                    <p className="text-white font-medium">{v.store_name} {v.is_verified && <CheckCircle size={14} className="text-blue-400 inline-block ml-1" />}</p>
                    <p className="text-white/50 text-xs">{v.location}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {searchResults.products?.length > 0 && (
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Products</p>
              {searchResults.products.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-3 border-b border-white/10">
                  {p.media_urls?.[0] ? (
                    <img src={p.media_urls[0]} className="w-12 h-12 rounded-lg object-cover" alt={p.title} />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-800" />
                  )}
                  <div>
                    <p className="text-white font-medium">{p.title}</p>
                    <p className="text-yellow-400 text-sm font-semibold">UGX {Number(p.price).toLocaleString()}</p>
                    <p className="text-white/40 text-xs">{p.vendors?.store_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {searchResults.vendors?.length === 0 && searchResults.products?.length === 0 && (
            <p className="text-white/40 text-center py-10">No results for "{searchQuery}"</p>
          )}
        </div>
      )}

      {/* ── Feed ── */}
      {showMarketingOnce && marketing?.text && (
        <div className="absolute inset-x-0 top-24 z-20 px-4">
          <div className="marquee-wrapper overflow-hidden rounded-full border border-white/10 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 py-3 shadow-lg shadow-fuchsia-600/20">
            <div className="marquee-track text-white font-bold uppercase tracking-[0.24em]">
              {marketing.text} {marketing.text}
            </div>
          </div>
        </div>
      )}
      {showMarketingOnce && marketing?.video && (
        <div className="absolute inset-x-4 top-40 z-20 rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
          <video
            ref={marketingVideoRef}
            src={marketing.video}
            controls
            autoPlay
            loop
            muted={marketingMuted}
            playsInline
            className="w-full h-36 object-cover"
          />
          <button
            type="button"
            onClick={() => setMarketingMuted((value) => !value)}
            className="absolute top-3 right-3 z-30 rounded-full bg-black/60 p-2 text-white"
          >
            {marketingMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      )}
      {feedItems.length === 0 ? (
        <div className="h-full flex items-center justify-center flex-col gap-3">
          <p className="text-white/40 text-lg">No content yet</p>
          <p className="text-white/20 text-sm">
            {tab === 'following' ? 'Follow vendors to see their products' : 'Upload For You videos or add products to start the queue.'}
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="feed-container">
          {feedItems.map((item, idx) => (
            <div key={item.id} ref={(el) => (itemRefs.current[idx] = el)}>
              {item.isForYou ? (
                <ForYouFeedItem
                  item={item}
                  isActive={idx === activeIndex}
                  autoScrollEnabled={autoScrollEnabled}
                  onRequestNext={() => scrollToIndex(idx + 1)}
                />
              ) : (
                <FeedItem
                  product={item}
                  user={user}
                  onVendorClick={handleVendorClick}
                  onRequireAuth={onRequireAuth}
                  isActive={idx === activeIndex}
                  autoScrollEnabled={autoScrollEnabled}
                  onRequestNext={() => scrollToIndex(idx + 1)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Vendor profile popup ── */}
      {selectedVendor && (
        <VendorProfileModal
          vendor={selectedVendor}
          user={user}
          onClose={() => setSelectedVendor(null)}
        />
      )}
    </div>
  )
}

function ForYouFeedItem({ item, isActive, autoScrollEnabled, onRequestNext }) {
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' && window.localStorage.getItem('century-saved-videos')
      const arr = raw ? JSON.parse(raw) : []
      setSaved(arr.includes(item.id))
    } catch (e) {}
  }, [item.id])

  function toggleSave() {
    try {
      const key = 'century-saved-videos'
      const raw = window.localStorage.getItem(key)
      const arr = raw ? JSON.parse(raw) : []
      if (saved) {
        const next = arr.filter((id) => id !== item.id)
        window.localStorage.setItem(key, JSON.stringify(next))
        setSaved(false)
      } else {
        arr.push(item.id)
        window.localStorage.setItem(key, JSON.stringify(arr))
        setSaved(true)
      }
    } catch (e) { console.error(e) }
  }

  function handleForward() {
    const url = item.media_urls[0] || window.location.href
    const text = `${item.title} — For You on Century App: ${url}`
    if (navigator.share) {
      navigator.share({ title: item.title, text, url })
    } else {
      navigator.clipboard.writeText(url).then(() => { try { window.alert('Link copied to clipboard') } catch {} })
    }
  }

  function handleDownload() {
    const url = item.media_urls[0]
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `${(item.title || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  useEffect(() => {
    if (!videoRef.current) return
    if (isActive) {
      videoRef.current.play().catch(() => {})
    } else {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [isActive])

  useEffect(() => {
    if (!videoRef.current) return
    videoRef.current.muted = muted
  }, [muted])

  return (
    <div className="feed-item bg-black relative">
      <video
        ref={videoRef}
        src={item.media_urls[0]}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted={muted}
        onEnded={() => {
          if (autoScrollEnabled) {
            onRequestNext?.()
          } else if (videoRef.current) {
            videoRef.current.currentTime = 0
            videoRef.current.play().catch(() => {})
          }
        }}
      />
      <button
        onClick={() => setMuted((value) => !value)}
        className="absolute top-14 right-4 bg-black/50 rounded-full p-2.5 text-white z-10"
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
      <div className="absolute right-3 bottom-36 flex flex-col items-center gap-4 z-10">
        <button onClick={handleForward} className="flex flex-col items-center gap-1">
          <div className="bg-black/50 rounded-full p-2.5">
            <ArrowRight size={20} className="text-white" />
          </div>
          <span className="text-white text-xs">Forward</span>
        </button>
        <button onClick={toggleSave} className="flex flex-col items-center gap-1">
          <div className={`rounded-full p-2.5 ${saved ? 'bg-white/10' : 'bg-black/50'}`}>
            <Bookmark size={20} className="text-white" />
          </div>
          <span className="text-white text-xs">{saved ? 'Saved' : 'Save'}</span>
        </button>
        <button onClick={handleDownload} className="flex flex-col items-center gap-1">
          <div className="bg-black/50 rounded-full p-2.5">
            <Download size={20} className="text-white" />
          </div>
          <span className="text-white text-xs">Download</span>
        </button>
      </div>
      <div className="absolute bottom-20 left-4 right-4 text-white z-10">
        <p className="text-sm uppercase text-white/70 mb-1">For You</p>
        <h3 className="font-bold text-xl leading-snug">{item.title}</h3>
      </div>
    </div>
  )
}
