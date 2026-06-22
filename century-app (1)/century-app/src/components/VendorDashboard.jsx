'use client'
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, LogOut, User, MapPin, Phone, Store, CheckCircle } from 'lucide-react'
import { getVendorByUser, getVendorProducts, deleteProduct, updateVendor, createVendor, signOut, getFollowCount } from '@/lib/supabase'
import AddProductModal from './AddProductModal'

export default function VendorDashboard({ user, onSignOut }) {
  const [vendor, setVendor] = useState(null)
  const [products, setProducts] = useState([])
  const [followers, setFollowers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [tab, setTab] = useState('store') // store | profile
  const [profileEdit, setProfileEdit] = useState(false)
  const [pForm, setPForm] = useState({ store_name: '', location: '', whatsapp_number: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [user])

  async function load() {
    if (!user) return
    setLoading(true)
    const v = await getVendorByUser(user.id)
    if (v) {
      setVendor(v)
      setPForm({ store_name: v.store_name, location: v.location || '', whatsapp_number: v.whatsapp_number || '' })
      const p = await getVendorProducts(v.id)
      setProducts(p)
      getFollowCount(v.id).then(setFollowers)
    } else {
      setSetupOpen(true)
    }
    setLoading(false)
  }

  async function handleDelete(productId) {
    if (!confirm('Delete this product?')) return
    await deleteProduct(productId)
    setProducts((prev) => prev.filter((p) => p.id !== productId))
  }

  async function handleSaveProfile() {
    if (!vendor) return
    setSaving(true)
    await updateVendor(vendor.id, pForm)
    setVendor((v) => ({ ...v, ...pForm }))
    setProfileEdit(false)
    setSaving(false)
  }

  async function handleSignOut() {
    await signOut()
    onSignOut()
  }

  if (loading) return (
    <div className="h-dvh bg-brandlight flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="manage-scroll">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs text-brand font-semibold uppercase tracking-wider">Vendor</p>
          <h1 className="text-lg font-bold text-gray-900">{vendor?.store_name || 'My Store'}</h1>
        </div>
        <button onClick={handleSignOut} className="flex items-center gap-1 text-gray-400 text-sm">
          <LogOut size={16} /> Sign out
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex bg-white border-b border-gray-100">
        {['store', 'profile'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize transition ${tab === t ? 'text-brand border-b-2 border-brand' : 'text-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── STORE TAB ── */}
      {tab === 'store' && (
        <div className="p-4 pb-24">
          {/* Add product button */}
          <button onClick={() => setAddOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-2xl py-4 font-semibold text-base mb-6 shadow-lg shadow-purple-200">
            <Plus size={20} /> Create New Product
          </button>

          {/* Catalog */}
          <h2 className="text-brand font-bold text-lg mb-3">Your Catalog</h2>
          {products.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Store size={40} className="mx-auto mb-3 opacity-40" />
              <p>No products yet</p>
              <p className="text-sm mt-1">Tap the button above to add your first product</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                  {p.media_urls?.[0] ? (
                    p.media_type === 'video' ? (
                      <video src={p.media_urls[0]} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    ) : (
                      <img src={p.media_urls[0]} alt={p.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    )
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center">
                      <Store size={20} className="text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{p.title}</p>
                    <p className="text-brand font-bold text-sm">UGX {Number(p.price).toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.media_type === 'video' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        {p.media_type === 'video' ? '🎬 Video' : `🖼 ${p.media_urls?.length || 0} image(s)`}
                      </span>
                      {p.is_boosted && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">⚡ Boosted</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => setEditProduct(p)} className="p-2 bg-gray-100 rounded-xl">
                      <Pencil size={15} className="text-gray-600" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 bg-red-50 rounded-xl">
                      <Trash2 size={15} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PROFILE TAB ── */}
      {tab === 'profile' && vendor && (
        <div className="p-4 pb-24">
          <div className="card-surface rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Store Profile</h2>
              <button onClick={() => setProfileEdit(!profileEdit)}
                className="text-brand text-sm font-semibold">
                {profileEdit ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {profileEdit ? (
              <div className="space-y-3">
                <input className="input" placeholder="Store name" value={pForm.store_name}
                  onChange={(e) => setPForm((p) => ({ ...p, store_name: e.target.value }))} />
                <input className="input" placeholder="Location (e.g. Shop C12, Kampala)" value={pForm.location}
                  onChange={(e) => setPForm((p) => ({ ...p, location: e.target.value }))} />
                <input className="input" placeholder="WhatsApp (e.g. 256772123456)" value={pForm.whatsapp_number}
                  onChange={(e) => setPForm((p) => ({ ...p, whatsapp_number: e.target.value }))} />
                <button onClick={handleSaveProfile} disabled={saving}
                  className="w-full bg-brand text-white rounded-xl py-3 font-semibold disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <Row icon={Store} label="Store name" value={vendor.store_name} />
                <Row icon={MapPin} label="Location" value={vendor.location || 'Not set'} />
                <Row icon={Phone} label="WhatsApp" value={vendor.whatsapp_number || 'Not set'} />
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <span className={`text-sm font-semibold ${vendor.is_verified ? 'text-blue-600' : 'text-gray-400'}`}>
                    {vendor.is_verified ? (<><CheckCircle size={14} className="inline-block mr-2 text-blue-600" />Verified Vendor</>) : 'Not yet verified'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <StatCard label="Followers" value={followers} color="text-red-500" />
            <StatCard label="Products" value={products.length} />
            <StatCard label="Boosted" value={products.filter((p) => p.is_boosted).length} color="text-yellow-600" />
          </div>
        </div>
      )}

      {/* Modals */}
      {addOpen && (
        <AddProductModal vendorId={vendor?.id} onClose={() => setAddOpen(false)} onSaved={load} />
      )}
      {editProduct && (
        <AddProductModal vendorId={vendor?.id} product={editProduct} onClose={() => setEditProduct(null)} onSaved={load} />
      )}

      {/* First-time setup */}
      {setupOpen && <VendorSetup userId={user?.id} onDone={() => { setSetupOpen(false); load() }} />}
    </div>
  )
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={18} className="text-gray-400 mt-0.5" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-gray-800 font-medium">{value}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, color = 'text-brand' }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-gray-500 text-sm mt-1">{label}</p>
    </div>
  )
}

function VendorSetup({ userId, onDone }) {
  const [form, setForm] = useState({ store_name: '', location: '', whatsapp_number: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  async function handleCreate() {
    if (!form.store_name.trim()) return setError('Store name is required')
    setLoading(true)
    try {
      await createVendor(userId, form.store_name, form.location, form.whatsapp_number)
      onDone()
    } catch (e) { setError(e.message); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
      <div className="card-surface rounded-3xl p-6 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Store size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-bold">Set up your store</h2>
          <p className="text-gray-500 text-sm mt-1">You're almost ready to start selling</p>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <input className="input mb-3" placeholder="Store name *" value={form.store_name} onChange={set('store_name')} />
        <input className="input mb-3" placeholder="Location (e.g. Kampala, Garden City)" value={form.location} onChange={set('location')} />
        <input className="input mb-5" placeholder="WhatsApp number (e.g. 256772123456)" value={form.whatsapp_number} onChange={set('whatsapp_number')} />
        <button onClick={handleCreate} disabled={loading}
          className="w-full bg-brand text-white rounded-xl py-3.5 font-semibold disabled:opacity-60">
          {loading ? 'Creating...' : 'Launch My Store'}
        </button>
      </div>
    </div>
  )
}
