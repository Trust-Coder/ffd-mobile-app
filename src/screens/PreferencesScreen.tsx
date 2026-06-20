import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import Switch from '@/components/Switch'
import FilterChips from '@/components/FilterChips'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui'
import { useAuth } from '@/auth/AuthContext'
import { ApiException } from '@/lib/api'
import { getPreferences, updatePreferences } from '@/lib/endpoints'
import { SEVERITY_ORDER, severityLabel } from '@/lib/severity'
import type { NotificationPreferences } from '@/types/api'

// Full backend enum incl. NORMAL (= receive all) and EX_HIGH, labelled consistently.
const MIN_SEVERITY_OPTIONS = SEVERITY_ORDER.map((value) => ({ value, label: severityLabel(value) }))

export default function PreferencesScreen() {
  const { isAuthenticated } = useAuth()
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getPreferences()
      setPrefs(res.data)
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Could not load preferences.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) void load()
    else setLoading(false)
  }, [isAuthenticated, load])

  function patch(next: Partial<NotificationPreferences>) {
    setPrefs((prev) => (prev ? { ...prev, ...next } : prev))
    setSaved(false)
  }

  async function save() {
    if (!prefs) return
    setSaving(true)
    setError(null)
    try {
      await updatePreferences(prefs)
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="screen">
      <ScreenHeader title="Notifications" subtitle="Choose what you’re alerted about" back />

      {!isAuthenticated ? (
        <EmptyState message="Sign in to set notification preferences.">
          <Link to="/account" className="btn-primary">
            Sign in
          </Link>
        </EmptyState>
      ) : loading && !prefs ? (
        <LoadingState label="Loading preferences…" />
      ) : error && !prefs ? (
        <ErrorState message={error} onRetry={load} />
      ) : !prefs ? null : (
        <>
          <section className="pref-group">
            <PrefRow label="Flood advisories" desc="The headline warnings on the home screen">
              <Switch checked={prefs.advisory_enabled} onChange={(v) => patch({ advisory_enabled: v })} ariaLabel="Flood advisories" />
            </PrefRow>
            <PrefRow label="Daily bulletins" desc="FFD’s routine flood bulletins">
              <Switch checked={prefs.bulletins_enabled} onChange={(v) => patch({ bulletins_enabled: v })} ariaLabel="Daily bulletins" />
            </PrefRow>
            <PrefRow label="Watchlist alerts" desc="When a station you follow crosses a flood level">
              <Switch checked={prefs.watchlist_alerts_enabled} onChange={(v) => patch({ watchlist_alerts_enabled: v })} ariaLabel="Watchlist alerts" />
            </PrefRow>
          </section>

          <section className="pref-block">
            <h3 className="section-title">Minimum severity</h3>
            <p className="hint-text left">Only notify at this flood level and above.</p>
            <FilterChips
              options={MIN_SEVERITY_OPTIONS}
              value={prefs.min_severity}
              onChange={(v) => patch({ min_severity: v })}
              ariaLabel="Minimum severity"
            />
          </section>

          <section className="pref-block">
            <h3 className="section-title">Quiet hours</h3>
            <p className="hint-text left">Mute non-critical alerts during these hours (PKT).</p>
            <div className="quiet-row">
              <label className="field inline">
                <span className="field-label">From</span>
                <input className="field-input" type="time" value={prefs.quiet_hours_start ?? ''} onChange={(e) => patch({ quiet_hours_start: e.target.value || null })} />
              </label>
              <label className="field inline">
                <span className="field-label">To</span>
                <input className="field-input" type="time" value={prefs.quiet_hours_end ?? ''} onChange={(e) => patch({ quiet_hours_end: e.target.value || null })} />
              </label>
            </div>
          </section>

          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save preferences'}
          </button>
        </>
      )}
    </div>
  )
}

function PrefRow({ label, desc, children }: { label: string; desc: string; children: ReactNode }) {
  return (
    <div className="pref-row">
      <div className="pref-row-text">
        <div className="pref-row-label">{label}</div>
        <div className="pref-row-desc">{desc}</div>
      </div>
      {children}
    </div>
  )
}
