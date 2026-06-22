'use client'
import { useState, useEffect, useRef } from 'react'
import { Users, Store, ShoppingBag, Bell, CheckCircle, Zap, ZapOff, Shield, LogOut, ChevronDown, ChevronUp, Lock, Image, Trash2 } from 'lucide-react'
import {
  getAdminStats, getAllVendors, getAllProducts, getResetRequests,
  markResetSent, sendResetEmail, changeAdminPassword, updateVendor, updateProduct, signOut,
  uploadMedia, deleteMedia, deleteVendorAccount
} from '@/lib/supabase'
import {
  getBackgroundOptions, getStoredBackground, persistBackground, clearCustomBackground,
  getPageBackgroundOptions, getStoredPageBackground, persistPageBackground, clearCustomPageBackground,
  getStoredCompanyLogo, persistCompanyLogo, clearCompanyLogo,
  getStoredMarketingItems, persistMarketingItems, clearMarketingItems,
  getStoredForYouVideos, persistForYouVideos, clearForYouVideos
} from '@/components/BackgroundSwitcher'

export default function AdminDashboard({ onSignOut, onBackgroundChange, onPageBackgroundChange }) {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [vendors, setVendors] = useState([])
  const [products, setProducts] = useState([])
  const [resets, setResets] = useState([])
  const [loading, setLoading] = useState(true)
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passMsg, setPassMsg] = useState('')
  const [savingPass, setSavingPass] = useState(false)
  const [background, setBackground] = useState(getStoredBackground())
  const [backgrounds] = useState(getBackgroundOptions())
  const [pageBackground, setPageBackground] = useState(getStoredPageBackground())
  const [pageBackgrounds] = useState(getPageBackgroundOptions())
  const [customPageColor, setCustomPageColor] = useState(getStoredPageBackground().style.backgroundColor || '#f5f3ff')
  const [uploadError, setUploadError] = useState('')
  const [companyLogo, setCompanyLogo] = useState(getStoredCompanyLogo())
  const [logoUploadError, setLogoUploadError] = useState('')
  const [marketingText, setMarketingText] = useState('')
  const [marketingItems, setMarketingItems] = useState(getStoredMarketingItems())
  const [marketingError, setMarketingError] = useState('')
  const [marketingUploading, setMarketingUploading] = useState(false)
  const [forYouTitle, setForYouTitle] = useState('')
  const [forYouVideos, setForYouVideos] = useState(getStoredForYouVideos())
  const [forYouError, setForYouError] = useState('')
  const [forYouUploading, setForYouUploading] = useState(false)
  const fileInputRef = useRef(null)
  const logoInputRef = useRef(null)
  const marketingVideoInputRef = useRef(null)
  const forYouVideoInputRef = useRef(null)

  useEffect(() => { load() }, [tab])
  useEffect(() => {
    setCompanyLogo(getStoredCompanyLogo())
    setMarketingItems(getStoredMarketingItems())
    setForYouVideos(getStoredForYouVideos())
    const storedPageBg = getStoredPageBackground()
    setPageBackground(storedPageBg)
    setCustomPageColor(storedPageBg.style.backgroundColor || '#f5f3ff')
  }, [])

  async function load() {
    setLoading(true)
    if (tab === 'overview') {
      const s = await getAdminStats()
      setStats(s)
    } else if (tab === 'vendors') {
      const v = await getAllVendors()
      setVendors(v)
    } else if (tab === 'products') {
      const p = await getAllProducts()
      setProducts(p)
    } else if (tab === 'resets') {
      const r = await getResetRequests()
      setResets(r)
    }
    setLoading(false)
  }

  async function toggleVerify(vendor) {
    await updateVendor(vendor.id, { is_verified: !vendor.is_verified })
    setVendors((prev) => prev.map((v) => v.id === vendor.id ? { ...v, is_verified: !v.is_verified } : v))
  }

  async function toggleBoost(product) {
    await updateProduct(product.id, { is_boosted: !product.is_boosted })
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_boosted: !p.is_boosted } : p))
  }

  async function handleSendReset(reset) {
    try {
      await sendResetEmail(reset.id)
      setResets((prev) => prev.map((r) => r.id === reset.id ? { ...r, admin_sent: true } : r))
    } catch (e) {
      // Email sending isn't configured (no RESEND_API_KEY) or failed — fall back
      // to revealing the PIN so you can relay it yourself via email or WhatsApp.
      await markResetSent(reset.id)
      setResets((prev) => prev.map((r) => r.id === reset.id ? { ...r, admin_sent: true } : r))
      alert(`Couldn't send automatically (${e.message}).\n\nPIN for ${reset.email}: ${reset.pin}\n\nCopy this and send it to them via email or WhatsApp.`)
    }
  }

  async function handleChangePass() {
    if (newPass !== confirmPass) return setPassMsg('Passwords do not match')
    if (newPass.length < 6) return setPassMsg('Password must be at least 6 characters')
    setSavingPass(true)
    try {
      await changeAdminPassword(newPass)
      setPassMsg('Password updated successfully!')
      setNewPass(''); setConfirmPass('')
    } catch (e) {
      setPassMsg(e.message || 'Could not update password')
    }
    setSavingPass(false)
  }

  function applyBackground(bg) {
    persistBackground(bg)
    setBackground(bg)
    onBackgroundChange?.(bg)
  }

  function applyPageBackground(bg) {
    persistPageBackground(bg)
    setPageBackground(bg)
    setCustomPageColor(bg.style.backgroundColor || '#f5f3ff')
    onPageBackgroundChange?.(bg)
  }

  function handleCustomPageColor(value) {
    const custom = {
      id: 'custom',
      name: 'Custom color',
      style: { backgroundColor: value },
    }
    applyPageBackground(custom)
  }

  function triggerUpload() {
    fileInputRef.current?.click()
  }

  function triggerLogoUpload() {
    logoInputRef.current?.click()
  }

  function triggerMarketingUpload() {
    marketingVideoInputRef.current?.click()
  }

  function triggerForYouUpload() {
    forYouVideoInputRef.current?.click()
  }

  async function handleBackgroundUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload a valid image file.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result
      const custom = {
        id: 'custom',
        name: 'Custom Image',
        style: {
          backgroundImage: `radial-gradient(circle at 20% 20%, rgba(0,0,0,0.25), transparent 18%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.08), transparent 18%), url(${src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        },
      }
      applyBackground(custom)
      setUploadError('')
    }
    reader.readAsDataURL(file)
  }

  async function handleMarketingUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setMarketingError('Please upload a valid video file.')
      return
    }
    if (!marketingText.trim()) {
      setMarketingError('Please add a headline before uploading marketing video.')
      return
    }

    setMarketingUploading(true)
    setMarketingError('')
    try {
      const url = await uploadMedia(file, 'marketing')
      const nextItems = [
        ...marketingItems,
        { id: `${Date.now()}`, text: marketingText.trim(), video: url },
      ]
      setMarketingItems(nextItems)
      persistMarketingItems(nextItems)
      setMarketingText('')
    } catch (e) {
      setMarketingError(e.message || 'Could not upload marketing video')
    } finally {
      setMarketingUploading(false)
      event.target.value = null
    }
  }

  async function handleForYouUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setForYouError('Please upload a valid video file.')
      return
    }
    if (!forYouTitle.trim()) {
      setForYouError('Please add a title before uploading this video.')
      return
    }

    setForYouUploading(true)
    setForYouError('')
    try {
      const url = await uploadMedia(file, 'for-you')
      const nextVideos = [
        ...forYouVideos,
        { id: `${Date.now()}`, title: forYouTitle.trim(), video: url },
      ]
      setForYouVideos(nextVideos)
      persistForYouVideos(nextVideos)
      setForYouTitle('')
    } catch (e) {
      setForYouError(e.message || 'Could not upload for you video')
    } finally {
      setForYouUploading(false)
      event.target.value = null
    }
  }

  function handleLogoUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Please upload a valid image file.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result
      persistCompanyLogo(src)
      setCompanyLogo(src)
      setLogoUploadError('')
    }
    reader.readAsDataURL(file)
    event.target.value = null
  }

  function removeCustomBackground() {
    clearCustomBackground()
    const defaultBackground = backgrounds[0]
    applyBackground(defaultBackground)
  }

  function removeCustomPageBackground() {
    clearCustomPageBackground()
    const defaultPageBackground = pageBackgrounds[0]
    applyPageBackground(defaultPageBackground)
  }

  function removeCompanyLogo() {
    clearCompanyLogo()
    setCompanyLogo(null)
  }

  async function removeMarketingItem(item) {
    await deleteMedia(item.video)
    const nextItems = marketingItems.filter((m) => m.id !== item.id)
    setMarketingItems(nextItems)
    persistMarketingItems(nextItems)
  }

  async function removeForYouVideo(item) {
    await deleteMedia(item.video)
    const nextVideos = forYouVideos.filter((v) => v.id !== item.id)
    setForYouVideos(nextVideos)
    persistForYouVideos(nextVideos)
  }

  function moveForYouVideo(index, direction) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= forYouVideos.length) return
    const nextVideos = [...forYouVideos]
    const [moved] = nextVideos.splice(index, 1)
    nextVideos.splice(targetIndex, 0, moved)
    setForYouVideos(nextVideos)
    persistForYouVideos(nextVideos)
  }

  function handleMarketingTextChange(value) {
    setMarketingText(value)
  }

  function clearAllMarketing() {
    clearMarketingItems()
    setMarketingItems([])
  }

  function clearAllForYou() {
    clearForYouVideos()
    setForYouVideos([])
  }

  async function handleSignOut() {
    await signOut()
    onSignOut()
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'products', label: 'Products' },
    { id: 'resets', label: `Resets${stats?.pendingResets ? ` (${stats.pendingResets})` : ''}` },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="manage-scroll">
      {/* Header */}
      <div className="bg-brand text-white sticky top-0 z-10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={20} />
            <div>
              <p className="text-xs text-purple-200 uppercase tracking-wider">Admin Panel</p>
              <h1 className="text-lg font-bold leading-tight">Century App</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {companyLogo && (
              <img src={companyLogo} alt="Company logo" className="w-10 h-10 rounded-2xl object-cover border border-white/20" />
            )}
            <button onClick={handleSignOut} className="flex items-center gap-1 text-purple-200 text-sm">
              <LogOut size={16} /> Exit
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto bg-white border-b border-gray-100 scrollbar-none">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-3 text-sm font-semibold transition ${tab === t.id ? 'text-brand border-b-2 border-brand' : 'text-gray-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 pb-28">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === 'overview' && stats && (
              <div>
                <h2 className="text-gray-800 font-bold text-lg mb-4">Dashboard</h2>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <StatCard icon={Users} label="Total Users" value={stats.users} color="bg-blue-500" />
                  <StatCard icon={Store} label="Vendors" value={stats.vendors} color="bg-green-500" />
                  <StatCard icon={ShoppingBag} label="Products" value={stats.products} color="bg-yellow-500" />
                  <StatCard icon={Bell} label="Pending Resets" value={stats.pendingResets} color="bg-red-500" />
                </div>
                <div className="card-surface rounded-2xl p-4 mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <QuickBtn label="Verify Vendors" onClick={() => setTab('vendors')} />
                    <QuickBtn label="Boost Products" onClick={() => setTab('products')} />
                    <QuickBtn label="Password Resets" onClick={() => setTab('resets')} />
                    <QuickBtn label="Change Password" onClick={() => setTab('settings')} />
                  </div>
                </div>
              </div>
            )}

            {/* ── VENDORS ── */}
            {tab === 'vendors' && (
              <div>
                <div className="card-surface rounded-2xl p-4 mb-4">
                  <p className="text-blue-800 text-sm font-medium flex items-center gap-2">
                    <CheckCircle size={16} /> Verified vendors show a blue tick on their profile
                  </p>
                </div>
                <div className="space-y-3">
                  {vendors.length === 0 ? (
                    <p className="text-gray-400 text-center py-10">No vendors yet</p>
                  ) : vendors.map((v) => (
                    <div key={v.id} className="card-surface rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {v.store_name} {v.is_verified && <CheckCircle size={14} className="text-blue-500 inline-block ml-1" />}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">{v.profiles?.email || v.profiles?.phone}</p>
                        <p className="text-gray-400 text-xs">{v.location}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => toggleVerify(v)}
                          className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition ${v.is_verified ? 'bg-gray-100 text-gray-600' : 'border border-blue-400 text-blue-600'}`}>
                          {v.is_verified ? 'Unverify' : 'Verify'}
                        </button>
                        <button onClick={async () => {
                          if (!confirm('Suspend this vendor account and remove its content?')) return
                          try {
                            await deleteVendorAccount(v.id)
                            setVendors((prev) => prev.filter((x) => x.id !== v.id))
                          } catch (e) { alert(e.message || 'Could not suspend vendor') }
                        }}
                          className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-red-50 text-red-600">
                          <Trash2 size={14} /> Suspend
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── PRODUCTS ── */}
            {tab === 'products' && (
              <div>
                <div className="card-surface rounded-2xl p-4 mb-4">
                  <p className="text-yellow-800 text-sm font-medium flex items-center gap-2">
                    <Zap size={16} /> Boosted products appear first in the feed for all users
                  </p>
                </div>
                <div className="space-y-3">
                  {products.length === 0 ? (
                    <p className="text-gray-400 text-center py-10">No products yet</p>
                  ) : products.map((p) => (
                    <div key={p.id} className="card-surface rounded-2xl p-3 flex items-center gap-3">
                      {p.media_urls?.[0] ? (
                        <img src={p.media_urls[0]} className="w-14 h-14 rounded-xl object-cover shrink-0" alt={p.title} />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{p.title}</p>
                        <p className="text-brand text-sm font-bold">UGX {Number(p.price).toLocaleString()}</p>
                        <p className="text-gray-400 text-xs">{p.vendors?.store_name}</p>
                      </div>
                      <button onClick={() => toggleBoost(p)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold transition ${p.is_boosted ? 'bg-yellow-100 text-yellow-700' : 'border border-yellow-400 text-yellow-600'}`}>
                        {p.is_boosted ? <><ZapOff size={14} /> Unboost</> : <><Zap size={14} /> Boost</>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── RESETS ── */}
            {tab === 'resets' && (
              <div>
                <div className="card-surface rounded-2xl p-4 mb-4">
                  <p className="text-orange-800 text-sm font-medium">
                    Tapping "Send PIN" emails the reset code straight to the user. If email
                    sending isn't set up yet, it'll show you the PIN to copy and send yourself instead.
                  </p>
                </div>
                <div className="space-y-3">
                  {resets.length === 0 ? (
                    <p className="text-gray-400 text-center py-10">No reset requests yet</p>
                  ) : resets.map((r) => (
                    <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{r.email}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{new Date(r.created_at).toLocaleString()}</p>
                        </div>
                        {r.admin_sent ? (
                          <span className="text-green-600 text-sm font-semibold flex items-center gap-1">
                            <CheckCircle size={14} /> Sent
                          </span>
                        ) : (
                          <button onClick={() => handleSendReset(r)}
                            className="bg-brand text-white px-3 py-1.5 rounded-xl text-sm font-semibold">
                            Send PIN
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SETTINGS ── */}
            {tab === 'settings' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Lock size={20} className="text-brand" />
                    <h2 className="text-lg font-bold text-gray-900">Change Admin Password</h2>
                  </div>
                  <input type="password" className="input mb-3" placeholder="New password"
                    value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                  <input type="password" className="input mb-4" placeholder="Confirm new password"
                    value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
                  {passMsg && (
                    <p className={`text-sm mb-3 ${passMsg.includes('success') ? 'text-green-600' : 'text-red-500'}`}>{passMsg}</p>
                  )}
                  <button onClick={handleChangePass} disabled={savingPass}
                    className="w-full bg-brand text-white rounded-xl py-3.5 font-semibold disabled:opacity-60">
                    {savingPass ? 'Saving...' : 'Update Password'}
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Image size={20} className="text-brand" />
                    <h2 className="text-lg font-bold text-gray-900">App Background</h2>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Choose the live app background visible across the feed.</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {backgrounds.map((bgOption) => (
                      <button key={bgOption.id} type="button"
                        onClick={() => applyBackground(bgOption)}
                        className={`rounded-3xl border p-4 text-left transition ${background.id === bgOption.id ? 'border-brand bg-brand/10' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                        <p className="font-semibold text-sm text-gray-900">{bgOption.name}</p>
                      </button>
                    ))}
                    <button type="button" onClick={triggerUpload}
                      className={`rounded-3xl border border-dashed p-4 text-left transition ${background.id === 'custom' ? 'border-brand bg-brand/10' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                      <p className="font-semibold text-sm text-gray-900">Upload custom image</p>
                      <p className="text-gray-500 text-xs mt-1">PNG, JPG, WebP</p>
                    </button>
                  </div>
                  {uploadError && <p className="text-sm text-red-500 mb-3">{uploadError}</p>}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                  {background.id === 'custom' && (
                    <button type="button" onClick={removeCustomBackground}
                      className="w-full bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-200 transition">
                      Remove custom image
                    </button>
                  )}
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Image size={20} className="text-brand" />
                    <h2 className="text-lg font-bold text-gray-900">App Page Color</h2>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Choose the page background color for admin and vendor screens.</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {pageBackgrounds.map((pageBg) => (
                      <button key={pageBg.id} type="button"
                        onClick={() => applyPageBackground(pageBg)}
                        className={`rounded-3xl border p-3 transition text-left ${pageBackground.id === pageBg.id ? 'border-brand bg-brand/10' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                        <div className="h-14 rounded-3xl border border-white/20 shadow-sm" style={pageBg.style} />
                        <p className="text-xs font-semibold mt-3 text-gray-900">{pageBg.name}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <input type="color" value={customPageColor}
                      onChange={(e) => setCustomPageColor(e.target.value)}
                      className="w-16 h-12 rounded-3xl border border-gray-200 p-0" />
                    <button type="button" onClick={() => handleCustomPageColor(customPageColor)}
                      className="flex-1 bg-brand text-white rounded-3xl px-4 py-3 text-sm font-semibold">
                      Apply custom color
                    </button>
                  </div>
                  {pageBackground.id === 'custom' && (
                    <button type="button" onClick={removeCustomPageBackground}
                      className="w-full bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-200 transition">
                      Reset page color
                    </button>
                  )}
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Image size={20} className="text-brand" />
                    <h2 className="text-lg font-bold text-gray-900">Company Logo</h2>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Company logo" className="w-20 h-20 rounded-3xl object-cover border border-gray-200" />
                    ) : (
                      <div className="w-20 h-20 rounded-3xl bg-gray-100 border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-500">
                        No logo
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-3">Upload the company logo used for admin branding and reports.</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={triggerLogoUpload}
                          className="bg-brand text-white rounded-xl px-4 py-2 text-sm font-semibold">
                          Upload Logo
                        </button>
                        {companyLogo && (
                          <button type="button" onClick={removeCompanyLogo}
                            className="bg-gray-100 text-gray-700 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-gray-200 transition">
                            Remove Logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {logoUploadError && <p className="text-sm text-red-500">{logoUploadError}</p>}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Image size={20} className="text-brand" />
                <h2 className="text-lg font-bold text-gray-900">Marketing Content</h2>
              </div>
              <p className="text-sm text-gray-500 mb-3">Upload unlimited marketing videos with headlines.</p>
              <textarea
                className="input mb-4 resize-none"
                rows={3}
                placeholder="Marketing headline for the feed"
                value={marketingText}
                onChange={(e) => handleMarketingTextChange(e.target.value)}
              />
              <button type="button" onClick={triggerMarketingUpload}
                className="w-full bg-brand text-white rounded-3xl px-4 py-3 text-sm font-semibold mb-4">
                Upload Marketing Video
              </button>
              {marketingUploading && <p className="text-sm text-brand mb-3">Uploading video...</p>}
              {marketingError && <p className="text-sm text-red-500 mb-3">{marketingError}</p>}
              <input ref={marketingVideoInputRef} type="file" accept="video/*" className="hidden" onChange={handleMarketingUpload} />
              {marketingItems.length > 0 && (
                <div className="space-y-3 mb-4">
                  {marketingItems.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-gray-200 overflow-hidden">
                      <video src={item.video} controls className="w-full h-44 object-cover" />
                      <div className="p-4 bg-gray-50">
                        <p className="font-semibold text-gray-900">{item.text}</p>
                        <button type="button" onClick={() => removeMarketingItem(item)}
                          className="mt-3 bg-gray-100 text-gray-700 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-gray-200 transition">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={clearAllMarketing}
                    className="w-full bg-gray-100 text-gray-700 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-gray-200 transition">
                    Clear all marketing content
                  </button>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Image size={20} className="text-brand" />
                <h2 className="text-lg font-bold text-gray-900">For You Videos</h2>
              </div>
              <p className="text-sm text-gray-500 mb-3">Upload unlimited autoplay videos to appear in the For You queue.</p>
              <input
                type="text"
                className="input mb-3"
                placeholder="For You video title"
                value={forYouTitle}
                onChange={(e) => setForYouTitle(e.target.value)}
              />
              <button type="button" onClick={triggerForYouUpload}
                className="w-full bg-brand text-white rounded-3xl px-4 py-3 text-sm font-semibold mb-4">
                Upload For You Video
              </button>
              {forYouUploading && <p className="text-sm text-brand mb-3">Uploading video...</p>}
              {forYouError && <p className="text-sm text-red-500 mb-3">{forYouError}</p>}
              <input ref={forYouVideoInputRef} type="file" accept="video/*" className="hidden" onChange={handleForYouUpload} />
              {forYouVideos.length > 0 && (
                <div className="space-y-3 mb-4">
                  {forYouVideos.map((videoItem, idx) => (
                    <div key={videoItem.id} className="rounded-3xl border border-gray-200 overflow-hidden">
                      <video src={videoItem.video} controls muted playsInline className="w-full h-44 object-cover" />
                      <div className="p-4 bg-gray-50">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{videoItem.title}</p>
                            <p className="text-xs text-gray-500 mt-1">Preview and reorder the For You queue.</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button type="button" onClick={() => moveForYouVideo(idx, -1)}
                              disabled={idx === 0}
                              className="rounded-full bg-white border border-gray-200 p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40">
                              <ChevronUp size={16} />
                            </button>
                            <button type="button" onClick={() => moveForYouVideo(idx, 1)}
                              disabled={idx === forYouVideos.length - 1}
                              className="rounded-full bg-white border border-gray-200 p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40">
                              <ChevronDown size={16} />
                            </button>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeForYouVideo(videoItem)}
                          className="mt-3 bg-gray-100 text-gray-700 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-gray-200 transition">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={clearAllForYou}
                    className="w-full bg-gray-100 text-gray-700 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-gray-200 transition">
                    Clear all For You videos
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-gray-500 text-sm mt-0.5">{label}</p>
    </div>
  )
}

function QuickBtn({ label, onClick }) {
  return (
    <button onClick={onClick}
      className="bg-brandlight text-brand rounded-xl py-2.5 text-sm font-semibold hover:bg-purple-100 transition">
      {label}
    </button>
  )
}
