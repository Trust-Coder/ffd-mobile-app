import { Link } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import { SeverityChip, StatusDot, StaleBanner } from '@/components/ui'
import { useResource } from '@/hooks/useResource'
import { getActiveAdvisory, getBulletins, getFlowsLatest } from '@/lib/endpoints'
import type { FloodStatus, StationSummary } from '@/types/api'
import { SEVERITY_ORDER, isElevated, severityColor, severityLabel } from '@/lib/severity'
import { fmtCusecs, fmtRelative } from '@/lib/format'

function highestStatus(list: StationSummary[]): FloodStatus {
  return list.reduce<FloodStatus>((acc, s) => (SEVERITY_ORDER.indexOf(s.status) > SEVERITY_ORDER.indexOf(acc) ? s.status : acc), 'NORMAL')
}

export default function HomeScreen() {
  const advisory = useResource(() => getActiveAdvisory(), [])
  const flows = useResource(() => getFlowsLatest(), [])
  const bulletins = useResource(() => getBulletins(), [])

  const stations = flows.data ?? []
  const elevated = stations.filter((s) => isElevated(s.status)).sort((a, b) => SEVERITY_ORDER.indexOf(b.status) - SEVERITY_ORDER.indexOf(a.status))
  const peak = stations.length ? highestStatus(stations) : 'NORMAL'
  const latestBulletin = bulletins.data?.[0]
  const active = advisory.data

  return (
    <div className="screen">
      <ScreenHeader title="FFD Flood" subtitle="Flood Forecasting Division · Pakistan" />

      {flows.stale ? <StaleBanner cachedAt={flows.cachedAt} /> : null}

      {/* Flood advisory card — highlighted when active. */}
      {active ? (
        <Link to={`/alerts`} className="advisory-card active link-reset" aria-label="Active flood advisory">
          <div className="advisory-head">
            <span className="advisory-badge pulse" style={{ background: severityColor(active.severity ?? 'HIGH') }}>
              Active Advisory
            </span>
            {active.valid_until ? <span className="advisory-state">until {fmtRelative(active.valid_until)}</span> : null}
          </div>
          <h2 className="advisory-title">{active.title}</h2>
          {active.guidance ? <p className="advisory-body">{active.guidance}</p> : null}
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
            <span className="teaser-kicker">Latest bulletin</span>
            {latestBulletin.severity ? <SeverityChip status={latestBulletin.severity} /> : null}
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
              <li key={s.id}>
                <Link to={`/stations/${s.id}`} className="station-row link-reset">
                  <StatusDot status={s.status} />
                  <div className="station-row-main">
                    <div className="station-row-name">{s.name}</div>
                    <div className="station-row-sub">{s.river}</div>
                  </div>
                  <div className="station-row-readout">
                    <span className="readout">{fmtCusecs(s.latest_value)}</span>
                    <SeverityChip status={s.status} />
                  </div>
                </Link>
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
