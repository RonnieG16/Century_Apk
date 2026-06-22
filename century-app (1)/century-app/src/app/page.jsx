'use client'
import { useState, useEffect, useRef } from 'react'
import { Home, Store, LogIn, X, HelpCircle, Phone, Bookmark } from 'lucide-react'
import { supabase, getProfile, signInAdmin, signOut } from '@/lib/supabase'
import Feed from '@/components/Feed'
import AuthModal from '@/components/AuthModal'
import VendorDashboard from '@/components/VendorDashboard'
import AdminDashboard from '@/components/AdminDashboard'
import SavedVideos from '@/components/SavedVideos'
import BackgroundSwitcher, { getStoredBackground, getStoredPageBackground } from '@/components/BackgroundSwitcher'
import { getAllVendors } from '@/lib/supabase'

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('feed') // feed | saved | manage | admin
  const [showAuth, setShowAuth] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminPass, setAdminPass] = useState('')
  const [adminError, setAdminError] = useState('')
  const [logoTaps, setLogoTaps] = useState(0)
  const [background, setBackground] = useState(null)
  const [pageBackground, setPageBackground] = useState(null)
  const logoTapTimer = useRef(null)
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [vendorContacts, setVendorContacts] = useState([])
  const [activeVendor, setActiveVendor] = useState(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const longPressTimer = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setView('feed')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setBackground(getStoredBackground())
    setPageBackground(getStoredPageBackground())
  }, [])

  useEffect(() => {
    // Load vendor contacts for the WhatsApp modal
    getAllVendors().then((v) => {
      const withWhatsapp = (v || []).filter((x) => x.whatsapp_number)
      setVendorContacts(withWhatsapp)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!pageBackground || typeof document === 'undefined') return
    document.documentElement.style.setProperty('--page-background', pageBackground.style.backgroundColor)
  }, [pageBackground])

  async function loadProfile(id) {
    const p = await getProfile(id)
    setProfile(p)
  }

  // ── Logo tap handler (4 taps → admin login) ──
  function handleLogoTap() {
    const newCount = logoTaps + 1
    setLogoTaps(newCount)
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current)
    if (newCount >= 4) {
      setLogoTaps(0)
      setShowAdminLogin(true)
      return
    }
    logoTapTimer.current = setTimeout(() => setLogoTaps(0), 1500)
  }

  async function handleAdminLogin() {
    setAdminError('')
    try {
      const { user: adminUser, profile: adminProfile } = await signInAdmin(adminPass)
      setUser(adminUser)
      setProfile(adminProfile)
      setShowAdminLogin(false)
      setAdminPass('')
      setView('admin')
    } catch (e) {
      setAdminError(e.message || 'Incorrect password')
    }
  }

  function handleSignOut() {
    setUser(null)
    setProfile(null)
    setView('feed')
  }

  // ── Manage tab click ──
  function handleManageClick() {
    if (!user) {
      setShowAuth(true)
    } else if (profile?.role === 'vendor' || profile?.role === 'admin') {
      setView(profile.role === 'admin' ? 'admin' : 'manage')
    } else {
      setShowAuth(true)
    }
  }

  const isVendor = profile?.role === 'vendor'
  const isAdmin = profile?.role === 'admin'

  if (loading) return (
    <div className="h-dvh bg-black flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center">
        <Store size={32} className="text-white" />
      </div>
      <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="relative h-dvh flex flex-col overflow-hidden bg-black">
      <BackgroundSwitcher background={background} />
      {/* Floating support / whatsapp shortcuts */}
      <div className="absolute top-6 right-4 z-40 flex flex-col gap-3">
        <a href="mailto:support@century.app?subject=Support%20Request"
          className="w-12 h-12 bg-white/6 backdrop-blur-sm rounded-full flex items-center justify-center text-white shadow-lg hover:scale-95 transition">
          <HelpCircle size={18} />
        </a>
        <div className="relative">
          {showTooltip && activeVendor && (
            <div className="absolute -top-16 right-0 bg-black/80 text-white text-xs rounded-md px-3 py-2 w-52 shadow-lg">
              <div className="font-semibold">{activeVendor.store_name}</div>
              <div className="text-gray-200 text-[11px] mt-1">{activeVendor.whatsapp_number}</div>
            </div>
          )}
          <button
            onMouseDown={() => {
              // start long-press timer (600ms)
              if (longPressTimer.current) clearTimeout(longPressTimer.current)
              longPressTimer.current = setTimeout(() => {
                if (activeVendor?.whatsapp_number) {
                  const clean = (activeVendor.whatsapp_number || '').replace(/\D/g, '')
                  window.open(`https://wa.me/${clean}`, '_blank')
                } else {
                  setShowVendorModal(true)
                }
              }, 600)
            }}
            onTouchStart={() => {
              if (longPressTimer.current) clearTimeout(longPressTimer.current)
              longPressTimer.current = setTimeout(() => {
                if (activeVendor?.whatsapp_number) {
                  const clean = (activeVendor.whatsapp_number || '').replace(/\D/g, '')
                  window.open(`https://wa.me/${clean}`, '_blank')
                } else {
                  setShowVendorModal(true)
                }
              }, 600)
            }}
            onMouseUp={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } }}
            onMouseLeave={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } setShowTooltip(false) }}
            onTouchEnd={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } }}
            onClick={() => {
              // short tap: open active vendor chat or show modal
              if (activeVendor?.whatsapp_number) {
                const clean = (activeVendor.whatsapp_number || '').replace(/\D/g, '')
                window.open(`https://wa.me/${clean}`, '_blank')
              } else {
                setShowVendorModal(true)
              }
            }}
            onMouseEnter={() => setShowTooltip(true)}
            className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-95 transition">
            <Phone size={18} />
          </button>
        </div>
      </div>
      {/* ── Main view ── */}
      <div className="relative flex-1 overflow-hidden">
        {view === 'feed' && <Feed user={user} onRequireAuth={() => setShowAuth(true)} onActiveVendorChange={setActiveVendor} />}
        {view === 'saved' && <SavedVideos onBack={() => setView('feed')} />}
        {view === 'manage' && <VendorDashboard user={user} onSignOut={handleSignOut} />}
        {view === 'admin' && <AdminDashboard onSignOut={handleSignOut} onBackgroundChange={setBackground} onPageBackgroundChange={setPageBackground} />}
      </div>

      {/* ── Bottom navigation ── */}
      <nav className="absolute bottom-0 inset-x-0 h-16 bg-black/90 backdrop-blur-sm border-t border-white/10 flex items-center z-20">
        {/* Feed tab */}
        <button onClick={() => setView('feed')}
          className={`flex-1 flex flex-col items-center gap-1 py-2 transition ${view === 'feed' ? 'text-white' : 'text-white/40'}`}>
          <Home size={22} strokeWidth={view === 'feed' ? 2.5 : 1.5} />
          <span className="text-xs">Feed</span>
        </button>

        {/* Saved tab */}
        <button onClick={() => setView('saved')}
          className={`flex-1 flex flex-col items-center gap-1 py-2 transition ${view === 'saved' ? 'text-white' : 'text-white/40'}`}>
          <Bookmark size={22} strokeWidth={view === 'saved' ? 2.5 : 1.5} />
          <span className="text-xs">Saved</span>
        </button>

        {/* Logo (center, hidden admin trigger) */}
        <button onClick={handleLogoTap} className="flex-1 flex flex-col items-center gap-1 py-2">
          <div className={`w-8 h-8 bg-brand rounded-xl flex items-center justify-center transition ${logoTaps > 0 ? 'scale-90' : 'scale-100'}`}>
            <span className="text-white text-xs font-black">CA</span>
          </div>
          <span className="text-white/20 text-xs">·</span>
        </button>

        {/* Manage tab */}
        <button onClick={handleManageClick}
          className={`flex-1 flex flex-col items-center gap-1 py-2 transition ${view === 'manage' || view === 'admin' ? 'text-brand' : 'text-white/40'}`}>
          <Store size={22} strokeWidth={view === 'manage' || view === 'admin' ? 2.5 : 1.5} />
          <span className="text-xs">Manage</span>
        </button>
      </nav>

      {/* ── Auth modal ── */}
      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} />
      )}

      {/* ── Admin password modal ── */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Admin Access</h2>
              <button onClick={() => { setShowAdminLogin(false); setAdminError(''); setAdminPass('') }}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <input type="password" className="input mb-3" placeholder="Enter admin password"
              value={adminPass} onChange={(e) => setAdminPass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} autoFocus />
            {adminError && <p className="text-red-500 text-sm mb-3">{adminError}</p>}
            <button onClick={handleAdminLogin}
              className="w-full bg-brand text-white rounded-xl py-3.5 font-semibold">
              Enter
            </button>
          </div>
        </div>
      )}

      {/* ── Vendor WhatsApp modal ── */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-4 w-full max-w-md shadow-2xl slide-up">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">Contact Vendors on WhatsApp</h2>
              <button onClick={() => setShowVendorModal(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Tap a vendor to open WhatsApp and start a chat. Vendors must add a WhatsApp number to their profile.</p>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {vendorContacts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No vendor WhatsApp contacts available</p>
              ) : vendorContacts.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-900">{v.store_name}</p>
                    <p className="text-xs text-gray-500">{v.whatsapp_number}</p>
                  </div>
                  <a
                    href={`https://wa.me/${(v.whatsapp_number || '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-green-500 text-white rounded-xl px-3 py-1.5 font-semibold">
                    Chat
                  </a>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button onClick={() => setShowVendorModal(false)} className="w-full bg-gray-100 rounded-xl py-2">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Login prompt (if guest taps Manage) ── */}
      {!user && view === 'feed' && (
        <button onClick={() => setShowAuth(true)}
          className="absolute top-12 right-4 z-30 bg-brand text-white rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-lg">
          <LogIn size={13} /> Sign in
        </button>
      )}
    </div>
  )
}
