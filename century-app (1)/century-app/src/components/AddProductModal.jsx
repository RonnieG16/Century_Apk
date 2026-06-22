'use client'
import { useState } from 'react'
import { X, Upload, Image, Video, Trash2 } from 'lucide-react'
import { createProduct, updateProduct, uploadMedia, deleteMedia } from '@/lib/supabase'

export default function AddProductModal({ vendorId, product, onClose, onSaved }) {
  const isEdit = !!product
  const [form, setForm] = useState({
    title: product?.title || '',
    description: product?.description || '',
    price: product?.price || '',
    media_type: product?.media_type || 'image',
  })
  const [files, setFiles] = useState([])
  const [existingUrls, setExistingUrls] = useState(product?.media_urls || [])
  const [removedUrls, setRemovedUrls] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const maxFiles = form.media_type === 'image' ? 2 : 1

  function handleFiles(e) {
    const selected = Array.from(e.target.files)
    const allowed = maxFiles - existingUrls.length
    if (selected.length > allowed) {
      setError(`Max ${maxFiles} ${form.media_type === 'image' ? 'images' : 'video'} allowed`)
      return
    }
    setFiles(selected.slice(0, allowed))
    setError('')
  }

  function removeExisting(url) {
    setExistingUrls((prev) => prev.filter((u) => u !== url))
    setRemovedUrls((prev) => [...prev, url])
  }

  async function handleSubmit() {
    if (!form.title.trim()) return setError('Product title is required')
    if (!form.price || isNaN(form.price)) return setError('Enter a valid price')
    const totalMedia = existingUrls.length + files.length
    if (totalMedia === 0) return setError('Please upload at least one image or video')

    setUploading(true)
    setError('')
    try {
      // Upload new files
      const newUrls = []
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading ${i + 1}/${files.length}...`)
        const url = await uploadMedia(files[i], vendorId)
        newUrls.push(url)
      }
      const allUrls = [...existingUrls, ...newUrls]

      if (isEdit) {
        await updateProduct(product.id, {
          title: form.title,
          description: form.description,
          price: Number(form.price),
          media_type: form.media_type,
          media_urls: allUrls,
        })
        if (removedUrls.length > 0) {
          await Promise.all(removedUrls.map((url) => deleteMedia(url)).filter(Boolean))
        }
      } else {
        await createProduct(vendorId, {
          title: form.title,
          description: form.description,
          price: Number(form.price),
          media_type: form.media_type,
          media_urls: allUrls,
        })
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
      setProgress('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto p-6 pb-10 slide-up max-h-[95dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{isEdit ? 'Edit Product' : 'New Product'}</h2>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>

        {/* Media type toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          {[{ v: 'image', label: 'Images (max 2)', icon: Image }, { v: 'video', label: 'Video (1)', icon: Video }].map(({ v, label, icon: Icon }) => (
            <button key={v} onClick={() => { setForm((p) => ({ ...p, media_type: v })); setFiles([]) }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${form.media_type === v ? 'bg-white shadow text-brand' : 'text-gray-500'}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Existing media */}
        {existingUrls.length > 0 && (
          <div className="flex gap-2 mb-3">
            {existingUrls.map((url) => (
              <div key={url} className="relative w-24 h-24">
                {form.media_type === 'image' ? (
                  <img src={url} className="w-full h-full object-cover rounded-xl" alt="" />
                ) : (
                  <video src={url} className="w-full h-full object-cover rounded-xl" />
                )}
                <button onClick={() => removeExisting(url)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5">
                  <X size={12} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload area */}
        {(existingUrls.length + files.length) < maxFiles && (
          <label className="block border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-brand transition mb-4">
            <Upload size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">
              {form.media_type === 'image' ? `Tap to upload up to ${maxFiles - existingUrls.length} image(s)` : 'Tap to upload a video'}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {form.media_type === 'image' ? 'JPG, PNG, WebP' : 'MP4, MOV — max 50MB'}
            </p>
            <input type="file" className="hidden"
              accept={form.media_type === 'image' ? 'image/*' : 'video/*'}
              multiple={form.media_type === 'image'}
              onChange={handleFiles} />
          </label>
        )}

        {/* File previews */}
        {files.length > 0 && (
          <div className="flex gap-2 mb-4">
            {files.map((f, i) => (
              <div key={i} className="relative w-24 h-24">
                {form.media_type === 'image' ? (
                  <img src={URL.createObjectURL(f)} className="w-full h-full object-cover rounded-xl" alt="" />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center">
                    <Video size={24} className="text-gray-400" />
                  </div>
                )}
                <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5">
                  <X size={12} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Form fields */}
        <input className="input mb-3" placeholder="Product title *" value={form.title} onChange={set('title')} />
        <textarea className="input mb-3 resize-none" rows={3} placeholder="Description (optional)"
          value={form.description} onChange={set('description')} />
        <div className="relative mb-5">
          <span className="absolute left-3 top-3.5 text-gray-400 text-sm font-medium">UGX</span>
          <input className="input pl-12" placeholder="Price e.g. 15000" type="number" inputMode="numeric"
            value={form.price} onChange={set('price')} />
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        {progress && <p className="text-brand text-sm mb-3 text-center">{progress}</p>}

        <button onClick={handleSubmit} disabled={uploading}
          className="w-full bg-brand text-white rounded-xl py-3.5 font-semibold hover:bg-purple-700 transition disabled:opacity-60">
          {uploading ? 'Saving...' : isEdit ? 'Save Changes' : 'Post Product'}
        </button>
      </div>
    </div>
  )
}
