import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import Icon from '@/components/Icon'
import ThemeToggle from '@/components/ThemeToggle'
import PaletteToggle from '@/components/PaletteToggle'
import { LoadingState } from '@/components/ui'
import { useAuth } from '@/auth/AuthContext'
import { ApiException } from '@/lib/api'
import { forgotPassword } from '@/lib/authApi'

type Mode = 'login' | 'register'

/** Google's multicolour "G" mark for the sign-in button. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  )
}

function AuthPanel() {
  const { login, register, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register({ name, email, password })
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function onForgot() {
    setError(null)
    if (!email) {
      setError('Enter your email first, then tap “Forgot password”.')
      return
    }
    try {
      await forgotPassword(email)
      setNotice('If that email is registered, a reset link is on its way.')
    } catch {
      setNotice('If that email is registered, a reset link is on its way.')
    }
  }

  async function onGoogle() {
    setError(null)
    setNotice(null)
    setGoogleBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Could not start Google sign-in.')
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <section className="auth-card">
      <div className="auth-tabs">
        <button type="button" aria-pressed={mode === 'login'} className={'auth-tab' + (mode === 'login' ? ' active' : '')} onClick={() => setMode('login')}>
          Sign in
        </button>
        <button type="button" aria-pressed={mode === 'register'} className={'auth-tab' + (mode === 'register' ? ' active' : '')} onClick={() => setMode('register')}>
          Register
        </button>
      </div>

      <form className="auth-form" onSubmit={submit}>
        {mode === 'register' ? (
          <label className="field">
            <span className="field-label">Name</span>
            <input className="field-input" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        ) : null}
        <label className="field">
          <span className="field-label">Email</span>
          <input className="field-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input className="field-input" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        {error ? <p className="error-text" role="alert">{error}</p> : null}
        {notice ? <p className="notice-text" role="status">{notice}</p> : null}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <div className="auth-divider"><span>or</span></div>
      <button type="button" className="btn-google" onClick={onGoogle} disabled={googleBusy}>
        <GoogleMark />
        {googleBusy ? 'Opening…' : 'Continue with Google'}
      </button>

      {mode === 'login' ? (
        <button type="button" className="link-btn" onClick={onForgot}>
          Forgot password?
        </button>
      ) : null}

      <p className="hint-text">Public flood data and the alerts feed work without an account. Sign in to keep a station watchlist and tune your alerts.</p>
    </section>
  )
}

function Profile() {
  const { user, logout } = useAuth()
  const [busy, setBusy] = useState(false)

  async function onLogout() {
    setBusy(true)
    try {
      await logout()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="profile-card">
        <div className="profile-avatar" aria-hidden="true">{user?.name?.[0]?.toUpperCase() ?? '·'}</div>
        <div className="profile-meta">
          <div className="profile-name">{user?.name}</div>
          <div className="profile-email">{user?.email}</div>
        </div>
      </section>

      <nav className="account-links">
        <Link to="/watchlist" className="account-link link-reset">
          <span className="account-link-label">
            <Icon name="star" size={18} />
            My Stations
          </span>
          <span className="chev">
            <Icon name="chevron-right" size={18} />
          </span>
        </Link>
        <Link to="/preferences" className="account-link link-reset">
          <span className="account-link-label">
            <Icon name="bell" size={18} />
            Notification preferences
          </span>
          <span className="chev">
            <Icon name="chevron-right" size={18} />
          </span>
        </Link>
        <Link to="/alerts" className="account-link link-reset">
          <span className="account-link-label">
            <Icon name="inbox" size={18} />
            Notification history
          </span>
          <span className="chev">
            <Icon name="chevron-right" size={18} />
          </span>
        </Link>
      </nav>

      <button type="button" className="btn-ghost block" onClick={onLogout} disabled={busy}>
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
    </>
  )
}

export default function AccountScreen() {
  const { isAuthenticated, loading } = useAuth()

  return (
    <div className="screen">
      <ScreenHeader title="Account" subtitle={isAuthenticated ? 'Your profile & alert settings' : 'Sign in to personalise your alerts'} />

      <section className="pref-block" aria-labelledby="appearance-heading">
        <h3 id="appearance-heading" className="section-title">Appearance</h3>
        <p className="appearance-label">Mode</p>
        <ThemeToggle />
        <p className="appearance-label" style={{ marginTop: '14px' }}>Colour theme</p>
        <PaletteToggle />
      </section>

      {loading ? <LoadingState label="Loading…" /> : isAuthenticated ? <Profile /> : <AuthPanel />}
    </div>
  )
}
