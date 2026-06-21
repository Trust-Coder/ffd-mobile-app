import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useTheme } from '@/theme/ThemeContext'

/**
 * Branded cold-start launch overlay. Named `LaunchScreen` to avoid clashing with
 * Capacitor's SplashScreen plugin. Theme-aware: white in light mode, a soft blue
 * in dark mode. Fades out (or dismisses on tap / after a timeout).
 */
const VISIBLE_MS = 1800
const FADE_MS = 300

interface Scheme {
  bg: string
  strong: string // GoP + PMD lines
  sub: string // Ministry line
  accent: string // Flood Forecasting Division line
  spinnerTrack: string
  spinnerHead: string
}

const LIGHT: Scheme = {
  // Essentially white, with a whisper of blue at the top so it isn't flat.
  bg: 'radial-gradient(135% 80% at 50% -15%, #eaf1ff 0%, #ffffff 55%), #ffffff',
  strong: '#101936',
  sub: '#5a6a8c',
  accent: '#1c39a3',
  spinnerTrack: 'rgba(35,71,184,0.18)',
  spinnerHead: '#2347b8',
}

const DARK: Scheme = {
  // Slight blue — deep navy-blue, lifted off near-black with a soft top glow.
  bg: 'radial-gradient(130% 85% at 50% -12%, #18275c 0%, rgba(24,39,92,0) 55%), #0c1838',
  strong: '#eef2ff',
  sub: '#aebbe0',
  accent: '#3fdcf6',
  spinnerTrack: 'rgba(91,124,255,0.25)',
  spinnerHead: '#3fdcf6',
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function LaunchScreen({ onDone }: { onDone?: () => void }) {
  const { resolved } = useTheme()
  const s = resolved === 'dark' ? DARK : LIGHT
  const reduced = prefersReducedMotion()
  const [leaving, setLeaving] = useState(false)
  const [hidden, setHidden] = useState(false)

  function dismiss() {
    setLeaving(true)
  }

  // Auto-dismiss after the visible window.
  useEffect(() => {
    const t = window.setTimeout(dismiss, VISIBLE_MS)
    return () => window.clearTimeout(t)
  }, [])

  // After the fade completes, unmount and notify the parent.
  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(
      () => {
        setHidden(true)
        onDone?.()
      },
      reduced ? 0 : FADE_MS,
    )
    return () => window.clearTimeout(t)
  }, [leaving, reduced, onDone])

  if (hidden) return null

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '28px',
    padding: '32px',
    textAlign: 'center',
    color: s.strong,
    background: s.bg,
    opacity: leaving && !reduced ? 0 : 1,
    transition: reduced ? 'none' : `opacity ${FADE_MS}ms ease`,
    WebkitFontSmoothing: 'antialiased',
  }

  const logoStyle: CSSProperties = { height: 74, width: 'auto', objectFit: 'contain' }

  return (
    <div
      className={'launch-screen' + (leaving ? ' leaving' : '')}
      style={overlayStyle}
      role="status"
      aria-label="Flood Forecasting Division — loading"
      onClick={dismiss}
    >
      <div
        className="launch-logos"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '22px' }}
      >
        <img src="/images/gop-logo.png" alt="Government of Pakistan" style={logoStyle} />
        <img src="/images/pmd-logo.png" alt="Pakistan Meteorological Department" style={logoStyle} />
      </div>

      <div className="launch-text" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontFamily: 'var(--font-display, "Sora", system-ui, sans-serif)', fontWeight: 700, fontSize: 19, letterSpacing: '-0.01em' }}>
          Government of Pakistan
        </span>
        <span style={{ fontFamily: 'var(--font-sans, "Inter", system-ui, sans-serif)', fontWeight: 500, fontSize: 14, color: s.sub }}>
          Ministry of Defence
        </span>
        <span style={{ fontFamily: 'var(--font-display, "Sora", system-ui, sans-serif)', fontWeight: 600, fontSize: 16, marginTop: 6 }}>
          Pakistan Meteorological Department
        </span>
        <span style={{ fontFamily: 'var(--font-sans, "Inter", system-ui, sans-serif)', fontWeight: 600, fontSize: 14.5, color: s.accent, letterSpacing: '0.01em' }}>
          Flood Forecasting Division
        </span>
      </div>

      {!reduced ? (
        <span
          className="launch-spinner"
          aria-hidden="true"
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: `2.5px solid ${s.spinnerTrack}`,
            borderTopColor: s.spinnerHead,
            animation: 'launch-spin 0.8s linear infinite',
          }}
        />
      ) : null}

      {/* Keyframes for the optional spinner; scoped, removed with the overlay. */}
      <style>{'@keyframes launch-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}
