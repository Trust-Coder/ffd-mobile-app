import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

/**
 * Branded cold-start launch overlay. Named `LaunchScreen` to avoid clashing with
 * Capacitor's SplashScreen plugin. Renders above the app on a navy "Deep
 * Institutional" gradient, then fades out (or dismisses on tap / after a timeout).
 *
 * Inline-styled with sensible fallbacks (navy bg, centred column) so it looks
 * right even before the rebrand CSS lands; the other agent restyles the
 * `.launch-screen` / `.launch-logos` / `.launch-text` classes.
 */
const VISIBLE_MS = 1800
const FADE_MS = 300

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function LaunchScreen({ onDone }: { onDone?: () => void }) {
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
    color: '#eef2ff',
    // Navy "Deep Institutional" gradient fallback (mirrors the mockup hero).
    background:
      'radial-gradient(120% 90% at 15% -10%, #1c2a63 0%, rgba(28,42,99,0) 55%), radial-gradient(120% 90% at 100% 0%, #07263a 0%, rgba(7,38,58,0) 50%), #070b18',
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
        <span style={{ fontFamily: 'var(--font-sans, "Inter", system-ui, sans-serif)', fontWeight: 500, fontSize: 14, color: '#aebbe0' }}>
          Ministry of Defence
        </span>
        <span style={{ fontFamily: 'var(--font-display, "Sora", system-ui, sans-serif)', fontWeight: 600, fontSize: 16, marginTop: 6 }}>
          Pakistan Meteorological Department
        </span>
        <span style={{ fontFamily: 'var(--font-sans, "Inter", system-ui, sans-serif)', fontWeight: 600, fontSize: 14.5, color: '#3fdcf6', letterSpacing: '0.01em' }}>
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
            border: '2.5px solid rgba(91,124,255,0.25)',
            borderTopColor: '#3fdcf6',
            animation: 'launch-spin 0.8s linear infinite',
          }}
        />
      ) : null}

      {/* Keyframes for the optional spinner; scoped, removed with the overlay. */}
      <style>{'@keyframes launch-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}
