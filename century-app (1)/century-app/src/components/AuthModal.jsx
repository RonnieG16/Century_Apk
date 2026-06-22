'use client'
import { useState } from 'react'
import { X, Mail, Phone, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import {
  signUpWithEmail, signInWithEmail, signInWithGoogle,
  signInWithPhone, verifyOtp, requestPasswordReset, supabase
} from '@/lib/supabase'

export default function AuthModal({ onClose, initialRole }) {
  const [step, setStep] = useState('role') // role | login | signup | otp | forgot | resetPin
  const [role, setRole] = useState(initialRole || null)
  const [method, setMethod] = useState('email') // email | phone
  const [isLogin, setIsLogin] = useState(true)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [otpPhone, setOtpPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetPin, setResetPin] = useState('')
  const [newPass, setNewPass] = useState('')

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    storeName: '', location: '', whatsapp: '',
  })

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const err = (msg) => { setError(msg); setLoading(false) }

  async function handleSubmit() {
    setError(''); setLoading(true)
    try {
      if (method === 'phone') {
        const phone = form.phone.startsWith('+') ? form.phone : '+256' + form.phone.replace(/^0/, '')
        await signInWithPhone(phone)
        setOtpPhone(phone)
        setStep('otp')
        setLoading(false)
        return
      }
      if (isLogin) {
        await signInWithEmail(form.email, form.password)
      } else {
        if (form.password !== form.confirmPassword) return err('Passwords do not match')
        if (form.password.length < 6) return err('Password must be at least 6 characters')
        const data = await signUpWithEmail(form.email, form.password, form.fullName, role)
        // If vendor, create vendor record
        if (role === 'vendor' && data.user) {
          const { createVendor } = await import('@/lib/supabase')
          await createVendor(data.user.id, form.storeName || form.fullName, form.location, form.whatsapp)
        }
        // mark to show marketing/promotional content once after account creation
        if (typeof window !== 'undefined' && data?.user) {
          try { window.localStorage.setItem('century-show-marketing', '1') } catch {}
        }
      }
      onClose()
    } catch (e) {
      err(e.message)
    }
  }

  async function handleOtp() {
    setLoading(true); setError('')
    try {
      const data = await verifyOtp(otpPhone, otpCode)
      if (data.user && role === 'vendor') {
        const { getVendorByUser, createVendor } = await import('@/lib/supabase')
        const existing = await getVendorByUser(data.user.id)
        if (!existing) await createVendor(data.user.id, form.storeName || 'My Store', form.location, form.whatsapp)
      }
      onClose()
    } catch (e) { err(e.message) }
  }

  async function handleForgot() {
    setLoading(true); setError('')
    try {
      await requestPasswordReset(forgotEmail)
      setSuccess('Your request was sent. The admin will email you a reset PIN shortly.')
      setLoading(false)
    } catch (e) { err(e.message) }
  }

  async function handleGoogleSignIn() {
    setError(''); setLoading(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      err(e.message)
    }
  }

  const GoogleBtn = () => (
    <button onClick={handleGoogleSignIn} disabled={loading}
      className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition">
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {loading ? 'Signing in...' : 'Continue with Google'}
    </button>
  )

  // ── Role selection ────────────────────────────────────────
  if (step === 'role') return (
    <Overlay onClose={onClose}>
      <h2 className="text-2xl font-bold text-center mb-1">Welcome to Century App</h2>
      <p className="text-gray-500 text-center mb-8 text-sm">Select your role to continue</p>
      <div className="space-y-3">
        <button onClick={onClose}
          className="w-full border border-gray-200 rounded-xl py-3.5 font-medium text-gray-700 hover:bg-gray-50 transition">
          No account — just browsing
        </button>
        <button onClick={() => { setRole('customer'); setStep('login') }}
          className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-semibold hover:bg-blue-700 transition">
          Customer
        </button>
        <button onClick={() => { setRole('vendor'); setStep('login') }}
          className="w-full bg-green-600 text-white rounded-xl py-3.5 font-semibold hover:bg-green-700 transition">
          Vendor
        </button>
      </div>
    </Overlay>
  )

  // ── OTP verify ────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <Overlay onClose={onClose} back={() => { setStep('login'); setOtpCode('') }}>
        <h2 className="text-xl font-bold mb-1">Enter OTP</h2>
        <p className="text-gray-500 text-sm mb-6">Sent to {otpPhone}</p>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <input className="input mb-4" placeholder="6-digit code" maxLength={6} inputMode="numeric"
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value)} />
        <Btn loading={loading} disabled={!otpCode.trim()} onClick={handleOtp}>Verify</Btn>
      </Overlay>
    )
  }

  // ── Forgot password ───────────────────────────────────────
  if (step === 'forgot') return (
    <Overlay onClose={onClose} back={() => setStep('login')}>
      <h2 className="text-xl font-bold mb-1">Reset Password</h2>
      <p className="text-gray-500 text-sm mb-6">Enter your email — the admin will send you a PIN</p>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm">{success}</div>
      ) : (
        <>
          <input className="input mb-4" placeholder="Your email" type="email"
            value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
          <Btn loading={loading} onClick={handleForgot}>Request Reset PIN</Btn>
        </>
      )}
    </Overlay>
  )

  // ── Login / Signup ────────────────────────────────────────
  return (
    <Overlay onClose={onClose} back={() => setStep('role')}>
      <h2 className="text-xl font-bold mb-1">{isLogin ? 'Sign in' : 'Create account'}</h2>
      <p className="text-gray-500 text-sm mb-5 capitalize">as {role}</p>

      {/* Method toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        {['email', 'phone'].map((m) => (
          <button key={m} onClick={() => setMethod(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${method === m ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {!isLogin && method === 'email' && (
        <input className="input mb-3" placeholder="Full name" value={form.fullName} onChange={set('fullName')} />
      )}

      {method === 'email' ? (
        <>
          <input className="input mb-3" placeholder="Email address" type="email" value={form.email} onChange={set('email')} />
          <div className="relative mb-3">
            <input className="input pr-10" placeholder="Password" type={showPass ? 'text' : 'password'}
              value={form.password} onChange={set('password')} />
            <button className="absolute right-3 top-3.5 text-gray-400" onClick={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {!isLogin && (
            <input className="input mb-3" placeholder="Confirm password" type="password"
              value={form.confirmPassword} onChange={set('confirmPassword')} />
          )}
        </>
      ) : (
        <input className="input mb-3" placeholder="Phone (e.g. 0772123456)" inputMode="tel"
          value={form.phone} onChange={set('phone')} />
      )}

      {/* Vendor extra fields */}
      {role === 'vendor' && !isLogin && (
        <>
          <input className="input mb-3" placeholder="Store name *" value={form.storeName} onChange={set('storeName')} />
          <input className="input mb-3" placeholder="Location (e.g. Centenary Building, Shop C12)" value={form.location} onChange={set('location')} />
          <input className="input mb-3" placeholder="WhatsApp number (e.g. 256772123456)" value={form.whatsapp} onChange={set('whatsapp')} />
        </>
      )}

      <Btn loading={loading} onClick={handleSubmit}>
        {method === 'phone' ? 'Send OTP' : isLogin ? 'Sign In' : 'Create Account'}
      </Btn>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-400 text-xs">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <GoogleBtn />

      <div className="flex justify-between mt-4">
        <button className="text-sm text-brand font-medium"
          onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
        {isLogin && (
          <button className="text-sm text-gray-400" onClick={() => setStep('forgot')}>
            Forgot password?
          </button>
        )}
      </div>
    </Overlay>
  )
}

// ── Shared UI pieces ──────────────────────────────────────
function Overlay({ children, onClose, back }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="card-surface rounded-t-3xl w-full max-w-md p-6 pb-10 slide-up max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          {back ? (
            <button onClick={back} className="text-gray-500 hover:text-gray-700">
              <ArrowLeft size={22} />
            </button>
          ) : <div />}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Btn({ loading, onClick, children, disabled }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
      {loading ? 'Please wait...' : children}
    </button>
  )
}
