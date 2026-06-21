import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import StationRow from '@/components/StationRow'
import { StaleBanner } from '@/components/ui'
import { useResource } from '@/hooks/useResource'
import { getActiveAdvisory, getBulletins, getFlowsLatest } from '@/lib/endpoints'
import type { FloodStatus, FlowLatest } from '@/types/api'
import { SEVERITY_ORDER, isElevated, severityColor, severityLabel } from '@/lib/severity'
import { advisoryState } from '@/lib/advisory'
import { fmtRelative } from '@/lib/format'

function highestStatus(list: FlowLatest[]): FloodStatus {
  return list.reduce<FloodStatus>((acc, s) => (s.status_id > SEVERITY_ORDER.indexOf(acc) ? s.status : acc), 'NORMAL')
}

export default function HomeScreen() {
  const advisory = useResource(() => getActiveAdvisory(), [])
  const flows = useResource(() => getFlowsLatest(), [])
  const bulletins = useResource(() => getBulletins(), [])

  const stations = flows.data ?? []
  const elevated = stations
    .filter((s) => isElevated(s.status))
    .sort((a, b) => b.status_id - a.status_id)
  const peak = stations.length ? highestStatus(stations) : 'NORMAL'
  const latestBulletin = bulletins.data?.[0]
  const active = advisory.data
  const advState = active ? advisoryState(active) : null

  return (
    <div className="screen">
      <ScreenHeader title="FFD Flood" subtitle="Flood Forecasting Division · Pakistan" refreshable />

      {flows.stale || advisory.stale ? <StaleBanner cachedAt={flows.cachedAt ?? advisory.cachedAt} /> : null}

      {/* Flood advisory card — highlighted only when genuinely active; an expired
          cached advisory fails safe to a de-emphasised state (0006 lifecycle). */}
      {active && advState === 'active' ? (
        <Link to={`/advisories/${active.id}`} className="advisory-card active link-reset" aria-label="Active flood advisory">
          <div className="advisory-head">
            <span className="advisory-badge pulse" style={{ '--sev': severityColor(active.severity ?? 'HIGH') } as CSSProperties}>
              Active Advisory
            </span>
            <span className="advisory-state">
              {active.valid_until ? `until ${fmtRelative(active.valid_until)}` : fmtRelative(active.issue_time)}
            </span>
          </div>
          <h2 className="advisory-title">{active.title}</h2>
          <p className="advisory-body">{active.guidance ?? 'Tap to read the full advisory and guidance.'}</p>
        </Link>
      ) : active && advState === 'expired' ? (
        <Link to={`/advisories/${active.id}`} className="advisory-card expired link-reset" aria-label="Expired flood advisory">
          <div className="advisory-head">
            <span className="advisory-badge muted">Expired Advisory</span>
            <span className="advisory-state">issued {fmtRelative(active.issue_time)}</span>
          </div>
          <h2 className="advisory-title">{active.title}</h2>
          <p className="advisory-body">This advisory has expired and is no longer in force. Tap to read it.</p>
        </Link>
      ) : (
        <section className="advisory-card" aria-label="Flood advisory">
          <div className="advisory-head">
            <span className="advisory-badge">Advisory</span>
            <span className="advisory-state">None active</span>
          </div>
          <p className="advisory-body">No flood advisory is currently in force. River conditions are within normal limits.</p>
        </section>
      )}

      {/* National severity ribbon. */}
      <section className="ribbon">
        <span className="ribbon-dot" style={{ background: severityColor(peak) }} />
        {peak === 'NORMAL' ? 'Rivers within normal limits' : `Highest level: ${severityLabel(peak)} flood`}
      </section>

      {/* Summary stats. */}
      <section className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{stations.length || '—'}</div>
          <div className="stat-label">Stations monitored</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: elevated.length ? severityColor(peak) : undefined }}>
            {stations.length ? elevated.length : '—'}
          </div>
          <div className="stat-label">Above normal</div>
        </div>
      </section>

      {/* Latest bulletin teaser. */}
      {latestBulletin ? (
        <Link to={`/bulletins/${latestBulletin.id}`} className="teaser link-reset">
          <div className="teaser-head">
            <span className="teaser-kicker">Latest {latestBulletin.type_label.toLowerCase()}</span>
          </div>
          <div className="teaser-title">{latestBulletin.title}</div>
          <div className="teaser-meta">{fmtRelative(latestBulletin.issue_time)}</div>
        </Link>
      ) : null}

      {/* Elevated river flows. */}
      {elevated.length ? (
        <section className="section-block">
          <h3 className="section-title">Rivers above normal</h3>
          <ul className="station-list">
            {elevated.map((s) => (
              <li key={s.station_id}>
                <StationRow id={s.station_id} name={s.name} sub={s.river} discharge={s.discharge} status={s.status} observedAt={s.observed_at} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link to="/stations" className="block-link">
        View all stations →
      </Link>
    </div>
  )
}
