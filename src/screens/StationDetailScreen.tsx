import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import DischargeChart from '@/components/DischargeChart'
import type { ChartPoint, ChartThreshold } from '@/components/DischargeChart'
import { SeverityChip, LoadingState, ErrorState, EmptyState, StaleBanner } from '@/components/ui'
import { useResource } from '@/hooks/useResource'
import { getStation } from '@/lib/endpoints'
import { severityColor, severityLabel } from '@/lib/severity'
import { fmtInt, fmtRelative } from '@/lib/format'

const CHART_LEVELS = new Set(['MEDIUM', 'HIGH', 'VERY_HIGH'])

export default function StationDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const stationId = Number(id)
  const { data, error, stale, cachedAt, loading, reload } = useResource(() => getStation(stationId), [stationId])

  const chartPoints = useMemo<ChartPoint[]>(
    () => (data?.series.points ?? []).map((p) => ({ t: p.t, value: p.outflow ?? p.inflow ?? 0 })),
    [data],
  )
  const chartThresholds = useMemo<ChartThreshold[]>(
    () =>
      (data?.thresholds ?? [])
        .filter((th) => th.min_discharge != null && CHART_LEVELS.has(th.level))
        .map((th) => ({ label: severityLabel(th.level), value: th.min_discharge as number, color: severityColor(th.level) })),
    [data],
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

  const { station, thresholds } = data
  const trendArrow = station.trend === 'up' ? '▲' : station.trend === 'down' ? '▼' : '▬'
  const subtitle = station.location?.area_name ? `${station.river} · ${station.location.area_name}` : station.river

  return (
    <div className="screen">
      <ScreenHeader title={station.name} subtitle={subtitle} back />

      {stale ? <StaleBanner cachedAt={cachedAt} /> : null}

      <section className="gauge-card">
        <div className="gauge-readout">
          <span className="gauge-value readout">{fmtInt(station.discharge)}</span>
          <span className="gauge-unit">cusecs</span>
          <span className={'gauge-trend trend-' + station.trend}>{trendArrow}</span>
        </div>
        <div className="gauge-meta">
          <SeverityChip status={station.status} />
          <span className="gauge-time">{station.observed_at ? fmtRelative(station.observed_at) : ''}</span>
        </div>
        {station.is_dam && station.dam_level != null ? (
          <div className="gauge-sub">Dam level <span className="readout">{fmtInt(station.dam_level)}</span> ft</div>
        ) : null}
      </section>

      {chartPoints.length > 1 ? (
        <section className="card-block">
          <h3 className="section-title">Discharge — last 24 hours</h3>
          <DischargeChart points={chartPoints} thresholds={chartThresholds} />
        </section>
      ) : null}

      {thresholds.length ? (
        <section className="card-block">
          <h3 className="section-title">Flood thresholds</h3>
          <table className="threshold-table">
            <tbody>
              {thresholds.map((th) => (
                <tr key={th.level}>
                  <td>
                    <SeverityChip status={th.level} />
                  </td>
                  <td className="readout">{th.min_discharge != null ? `${fmtInt(th.min_discharge)} cusecs` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* Watchlist + per-station alerts arrive with auth in Phase 3. */}
      <button type="button" className="btn-primary" disabled aria-describedby="watchlist-hint">
        ★ Add to My Stations
      </button>
      <p id="watchlist-hint" className="hint-text">
        Sign in to add this station to your watchlist and get alerts — coming in Phase 3.
      </p>
    </div>
  )
}
