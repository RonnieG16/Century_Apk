'use client'
import { useState, useEffect } from 'react'
import { X, MapPin, Users, ShoppingBag, Share2, CheckCircle } from 'lucide-react'
import { getFollowCount, isFollowing, toggleFollow, getVendorProductCount } from '@/lib/supabase'

export default function VendorProfileModal({ vendor, user, onClose }) {
  const [followers, setFollowers] = useState(0)
  const [productCount, setProductCount] = useState(null)
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!vendor) return
    getFollowCount(vendor.id).then(setFollowers)
    getVendorProductCount(vendor.id).then(setProductCount)
    if (user) isFollowing(user.id, vendor.id).then(setFollowing)
  }, [vendor, user])

  if (!vendor) return null

  async function handleFollow() {
    if (!user) return
    setLoading(true)
    await toggleFollow(user.id, vendor.id, following)
    setFollowing(!following)
    setFollowers((f) => following ? f - 1 : f + 1)
    setLoading(false)
  }

  function handleShare() {
    const text = `Check out ${vendor.store_name} on Century App!`
    if (navigator.share) {
      navigator.share({ title: vendor.store_name, text, url: window.location.href })
    } else {
      navigator.clipboard.writeText(text + ' ' + window.location.href)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl w-11/12 max-w-sm p-6 relative slide-up" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400">
          <X size={20} />
        </button>

        {/* Avatar */}
        <div className="flex justify-center mb-3">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
            <ShoppingBag size={36} className="text-gray-400" />
          </div>
        </div>

        {/* Name + verified */}
        <div className="text-center mb-1">
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-xl font-bold">{vendor.store_name}</h2>
            {vendor.is_verified && <CheckCircle title="Verified" size={16} className="text-blue-500 inline-block" />}
          </div>
        </div>

        {/* Location */}
        {vendor.location && (
          <div className="flex items-center justify-center gap-1 text-gray-500 text-sm mb-4">
            <MapPin size={13} />
            <span>{vendor.location}</span>
          </div>
        )}

        {/* Stats */}
        <div className="flex justify-center gap-10 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold">{followers}</p>
            <p className="text-gray-500 text-xs">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{productCount ?? '—'}</p>
            <p className="text-gray-500 text-xs">Products</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {user ? (
            <button onClick={handleFollow} disabled={loading}
              className={`flex-1 py-3 rounded-xl font-semibold transition ${following ? 'bg-gray-100 text-gray-700' : 'bg-red-500 text-white'}`}>
              {loading ? '...' : following ? 'Following' : 'Follow'}
            </button>
          ) : (
            <div className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-400 text-center text-sm">
              Login to follow
            </div>
          )}
          <button onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 font-medium text-gray-700">
            <Share2 size={16} /> Share
          </button>
        </div>
      </div>
    </div>
  )
}
