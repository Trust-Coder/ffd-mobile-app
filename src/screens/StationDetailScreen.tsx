import { useParams } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import DischargeChart from '@/components/DischargeChart'
import { SeverityChip, LoadingState, ErrorState, EmptyState, StaleBanner } from '@/components/ui'
import { useResource } from '@/hooks/useResource'
import { getStation } from '@/lib/endpoints'
import { fmtInt, fmtRelative } from '@/lib/format'

export default function StationDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const stationId = Number(id)
  const { data, error, stale, cachedAt, loading, reload } = useResource(
    () => getStation(stationId),
    [stationId],
  )

  if (loading && !data) {
    return (
      <div className="screen">
        <ScreenHeader title="Station" back />
        <LoadingState label="Loading station…" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="screen">
        <ScreenHeader title="Station" back />
        <ErrorState message={error} onRetry={reload} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="screen">
        <ScreenHeader title="Station" back />
        <EmptyState message="Station not found." />
      </div>
    )
  }

  const trendArrow = data.trend === 'up' ? '▲' : data.trend === 'down' ? '▼' : '▬'

  return (
    <div className="screen">
      <ScreenHeader title={data.name} subtitle={`${data.river}${data.location ? ` · ${data.location}` : ''}`} back />

      {stale ? <StaleBanner cachedAt={cachedAt} /> : null}

      <section className="gauge-card">
        <div className="gauge-readout">
          <span className="gauge-value readout">{fmtInt(data.latest_value)}</span>
          <span className="gauge-unit">cusecs</span>
          <span className={'gauge-trend trend-' + (data.trend ?? 'right')}>{trendArrow}</span>
        </div>
        <div className="gauge-meta">
          <SeverityChip status={data.status} />
          <span className="gauge-time">{data.observed_at ? fmtRelative(data.observed_at) : ''}</span>
        </div>
      </section>

      {data.series && data.series.length > 1 ? (
        <section className="card-block">
          <h3 className="section-title">Discharge — last 24 hours</h3>
          <DischargeChart series={data.series} thresholds={data.thresholds} />
        </section>
      ) : null}

      {data.thresholds ? (
        <section className="card-block">
          <h3 className="section-title">Flood thresholds</h3>
          <table className="threshold-table">
            <tbody>
              <tr>
                <td><SeverityChip status="MEDIUM" /></td>
                <td className="readout">{fmtInt(data.thresholds.medium)} cusecs</td>
              </tr>
              <tr>
                <td><SeverityChip status="HIGH" /></td>
                <td className="readout">{fmtInt(data.thresholds.high)} cusecs</td>
              </tr>
              <tr>
                <td><SeverityChip status="VERY_HIGH" /></td>
                <td className="readout">{fmtInt(data.thresholds.very_high)} cusecs</td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      {/* Watchlist + per-station alerts arrive with auth in Phase 3. */}
      <button type="button" className="btn-primary" disabled title="Sign in to use My Stations (Phase 3)">
        ★ Add to My Stations
      </button>
      <p className="hint-text">Sign in to add this station to your watchlist and get alerts — coming in Phase 3.</p>
    </div>
  )
}
