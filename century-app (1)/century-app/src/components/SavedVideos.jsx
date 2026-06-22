'use client'
import { useEffect, useState } from 'react'
import { ArrowLeft, Video, Trash2 } from 'lucide-react'
import { getSavedVideoItems, removeSavedVideoItem } from '@/lib/savedVideos'

export default function SavedVideos({ onBack }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    setItems(getSavedVideoItems())
  }, [])

  function handleRemove(id) {
    const next = removeSavedVideoItem(id)
    setItems(next)
  }

  return (
    <div className="absolute inset-0 z-30 bg-black">
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-white/10">
        <button onClick={onBack} className="rounded-full bg-white/10 p-3 text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-white text-lg font-bold">Saved videos</h2>
          <p className="text-white/60 text-sm">Your saved clips are available here.</p>
        </div>
      </div>
      <div className="px-4 py-4 space-y-4 overflow-y-auto h-[calc(100vh-96px)]">
        {items.length === 0 ? (
          <div className="bg-white/5 rounded-3xl p-6 text-center text-white/60">
            <Video size={40} className="mx-auto mb-3" />
            <p>No saved videos yet.</p>
          </div>
        ) : items.map((item) => (
          <div key={item.id} className="bg-white/5 rounded-3xl overflow-hidden">
            <div className="relative h-72 bg-black">
              <video src={item.media_urls?.[0] || item.video} className="w-full h-full object-cover" controls playsInline />
              <button onClick={() => handleRemove(item.id)}
                className="absolute top-3 right-3 rounded-full bg-black/70 p-2 text-white">
                <Trash2 size={18} />
              </button>
            </div>
            <div className="p-4 text-white">
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="text-white/60 text-sm mt-1">{item.description || 'Saved from your feed'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
