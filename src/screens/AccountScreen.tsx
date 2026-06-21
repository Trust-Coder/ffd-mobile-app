import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import Icon from '@/components/Icon'
import ThemeToggle from '@/components/ThemeToggle'
import { LoadingState } from '@/components/ui'
import { useAuth } from '@/auth/AuthContext'
import { ApiException } from '@/lib/api'
import { forgotPassword } from '@/lib/authApi'

type Mode = 'login' | 'register'

function AuthPanel() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

      <section className="pref-group" aria-labelledby="appearance-heading">
        <h3 id="appearance-heading" className="section-title">Appearance</h3>
        <ThemeToggle />
      </section>

      {loading ? <LoadingState label="Loading…" /> : isAuthenticated ? <Profile /> : <AuthPanel />}
    </div>
  )
}
