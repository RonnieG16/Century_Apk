'use client'
import { useState, useEffect, useRef } from 'react'
import { VolumeX, Volume2, MessageCircle, Heart, Share2, ShoppingBag, ChevronLeft, ChevronRight, ArrowRight, Download, Bookmark, CheckCircle } from 'lucide-react'
import { getLikeCount, getUserLike, toggleLike, getComments, addComment, deleteComment } from '@/lib/supabase'
import { addSavedVideoItem, getSavedVideoItems, removeSavedVideoItem } from '@/lib/savedVideos'

export default function FeedItem({ product, user, onVendorClick, onRequireAuth, isActive, autoScrollEnabled, onRequestNext }) {
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const [saved, setSaved] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  const isVideo = product.media_type === 'video'
  const mediaUrls = product.media_urls || []
  const hasMedia = mediaUrls.length > 0

  // Video play/pause based on active
  useEffect(() => {
    if (!videoRef.current) return
    if (isActive) {
      videoRef.current.autoplay = true
      videoRef.current.play().catch(() => {})
    } else {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [isActive])

  // Sync muted state to the video element so toggle works immediately
  useEffect(() => {
    if (!videoRef.current) return
    videoRef.current.muted = muted
    if (!muted && isActive) {
      videoRef.current.play().catch(() => {})
    }
  }, [muted, isActive])

  function handleToggleMute() {
    if (!videoRef.current) return
    const nextMuted = !muted
    setMuted(nextMuted)
    videoRef.current.muted = nextMuted
    if (!nextMuted && isActive) {
      videoRef.current.play().catch(() => {})
    }
  }

  // Load likes
  useEffect(() => {
    getLikeCount(product.id).then(setLikeCount)
    if (user) getUserLike(user.id, product.id).then(setLiked)
  }, [product.id, user])

  async function handleLike() {
    if (!user) return onRequireAuth?.()
    await toggleLike(user.id, product.id, liked)
    setLiked(!liked)
    setLikeCount((c) => liked ? c - 1 : c + 1)
  }

  async function handleShare() {
    const text = `${product.title} — UGX ${Number(product.price).toLocaleString()} on Century App`
    if (navigator.share) {
      navigator.share({ title: product.title, text, url: window.location.href })
    } else {
      navigator.clipboard.writeText(text)
    }
  }

  function handleForward() {
    const url = mediaUrls[0] || window.location.href
    const text = `Check out ${product.title} on Century App: ${url}`
    if (navigator.share) {
      navigator.share({ title: product.title, text, url })
    } else {
      navigator.clipboard.writeText(url).then(() => {
        try { window.alert('Link copied to clipboard') } catch {}
      })
    }
  }

  function toggleSave() {
    try {
      if (saved) {
        removeSavedVideoItem(product.id)
        setSaved(false)
      } else {
        addSavedVideoItem(product)
        setSaved(true)
      }
    } catch (e) { console.error(e) }
  }

  function handleDownload() {
    const url = mediaUrls[0]
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `${(product.title || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  function handleWhatsApp() {
    const num = product.vendors?.whatsapp_number
    if (!num) return
    const clean = num.replace(/\D/g, '')
    const msg = encodeURIComponent(`Hi! I saw your product "${product.title}" (UGX ${Number(product.price).toLocaleString()}) on Century App. Is it available?`)
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank')
  }

  async function openComments() {
    if (!showComments) {
      const data = await getComments(product.id)
      setComments(data)
    }
    setShowComments(!showComments)
  }

  async function submitComment() {
    if (!user) return onRequireAuth?.()
    if (!commentText.trim()) return
    setCommentLoading(true)
    const authorName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
    await addComment(user.id, product.id, commentText.trim(), authorName)
    const data = await getComments(product.id)
    setComments(data)
    setCommentText('')
    setCommentLoading(false)
  }

  useEffect(() => {
    try {
      const savedIds = getSavedVideoItems().map((item) => item.id)
      setSaved(savedIds.includes(product.id))
    } catch (e) {
      console.error(e)
    }
  }, [product.id])

  return (
    <div className="feed-item bg-black">
      {/* ── Media ── */}
      {hasMedia ? (
        isVideo ? (
          <video ref={videoRef} src={mediaUrls[0]} className="w-full h-full object-cover"
            autoPlay playsInline muted={muted}
            onEnded={() => {
              if (autoScrollEnabled) {
                onRequestNext?.()
              } else if (videoRef.current) {
                videoRef.current.currentTime = 0
                videoRef.current.play().catch(() => {})
              }
            }} />
        ) : (
          <div className="relative w-full h-full">
            <img src={mediaUrls[imgIndex]} alt={product.title} className="w-full h-full object-cover" />
            {mediaUrls.length > 1 && (
              <>
                <button onClick={() => setImgIndex((i) => Math.max(0, i - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 rounded-full p-1.5 text-white">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => setImgIndex((i) => Math.min(mediaUrls.length - 1, i + 1))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 rounded-full p-1.5 text-white">
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {mediaUrls.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIndex ? 'bg-white' : 'bg-white/40'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        )
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-900 to-black flex items-center justify-center">
          <ShoppingBag size={80} className="text-purple-400 opacity-50" />
        </div>
      )}

      {/* ── Gradient overlay ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

      {/* ── Top controls ── */}
      {isVideo && (
        <button onClick={handleToggleMute}
          className="absolute top-14 right-4 bg-black/50 rounded-full p-2.5 text-white z-10">
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      )}

      {/* ── Right action bar ── */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
        {/* Vendor */}
        <button onClick={() => onVendorClick(product.vendors)}
          className="bg-yellow-500 rounded-xl p-2.5 shadow-lg">
          <ShoppingBag size={22} className="text-white" />
        </button>

        {/* WhatsApp */}
        <button onClick={handleWhatsApp} className="flex flex-col items-center gap-1">
          <div className="bg-green-500 rounded-full p-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.552 4.116 1.516 5.849L.037 23.985l6.284-1.648A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.785 9.785 0 01-5.032-1.389l-.36-.214-3.732.979 1.001-3.648-.237-.374A9.78 9.78 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
            </svg>
          </div>
          <span className="text-white text-xs">WhatsApp</span>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="bg-black/50 rounded-full p-2.5">
            <Share2 size={22} className="text-white" />
          </div>
          <span className="text-white text-xs">Share</span>
        </button>

        {/* Forward */}
        <button onClick={handleForward} className="flex flex-col items-center gap-1">
          <div className="bg-black/50 rounded-full p-2.5">
            <ArrowRight size={22} className="text-white" />
          </div>
          <span className="text-white text-xs">Forward</span>
        </button>

        {/* Save */}
        <button onClick={toggleSave} className="flex flex-col items-center gap-1">
          <div className={`rounded-full p-2.5 ${saved ? 'bg-white/10' : 'bg-black/50'}`}>
            <Bookmark size={22} className="text-white" />
          </div>
          <span className="text-white text-xs">{saved ? 'Saved' : 'Save'}</span>
        </button>

        {/* Download */}
        <button onClick={handleDownload} className="flex flex-col items-center gap-1">
          <div className="bg-black/50 rounded-full p-2.5">
            <Download size={22} className="text-white" />
          </div>
          <span className="text-white text-xs">Download</span>
        </button>

        {/* Comments */}
        <button onClick={openComments} className="flex flex-col items-center gap-1">
          <div className="bg-black/50 rounded-full p-2.5">
            <MessageCircle size={22} className="text-white" />
          </div>
          <span className="text-white text-xs">{comments.length}</span>
        </button>

        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={`rounded-full p-2.5 ${liked ? 'bg-red-500' : 'bg-black/50'}`}>
            <Heart size={22} className="text-white" fill={liked ? 'white' : 'none'} />
          </div>
          <span className="text-white text-xs">{likeCount}</span>
        </button>
      </div>

      {/* ── Bottom info ── */}
      <div className="absolute bottom-20 left-4 right-20 z-10">
        <button onClick={() => onVendorClick(product.vendors)}
          className="flex items-center gap-2 mb-2">
          <ShoppingBag size={16} className="text-yellow-400" />
          <span className="text-white font-medium text-sm">
            {product.vendors?.store_name}
            {product.vendors?.is_verified && <CheckCircle size={14} className="text-blue-400 inline-block ml-1" />}
          </span>
        </button>
        <h3 className="text-white font-bold text-lg leading-tight">{product.title}</h3>
        {product.description && (
          <p className="text-white/80 text-sm mt-1 line-clamp-2">{product.description}</p>
        )}
        <div className="mt-2">
          <span className="bg-yellow-500 text-black font-bold px-3 py-1 rounded-lg text-sm">
            UGX {Number(product.price).toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Comments panel ── */}
      {showComments && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={() => setShowComments(false)}>
          <div className="w-full max-w-2xl h-[78vh] bg-black/95 rounded-t-3xl p-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold">Comments</span>
              <button onClick={() => setShowComments(false)} className="text-white/60 text-sm">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto px-1 py-2 space-y-3">
              {comments.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-8">No comments yet</p>
              ) : comments.map((c) => (
                <div key={c.id} className="flex gap-3 px-2">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {(c.author_name || 'U')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-white/60 text-xs">{c.author_name || 'User'}</p>
                    <p className="text-white text-sm leading-snug">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="flex gap-2">
                <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  placeholder={user ? 'Add a comment...' : 'Sign in to comment'}
                  onFocus={() => !user && onRequireAuth?.()}
                  onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                  className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-full px-4 py-3 text-sm outline-none" />
                <button onClick={submitComment} disabled={commentLoading || (user && !commentText.trim())}
                  className="bg-brand text-white rounded-full px-4 py-3 text-sm font-medium disabled:opacity-40">
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
