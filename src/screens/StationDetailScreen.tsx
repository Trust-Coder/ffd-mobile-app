import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import Icon from '@/components/Icon'
import type { IconName } from '@/components/Icon'
import DischargeChart from '@/components/DischargeChart'
import type { ChartPoint, ChartThreshold } from '@/components/DischargeChart'
import { SeverityChip, LoadingState, ErrorState, EmptyState, StaleBanner } from '@/components/ui'
import WatchlistControls from '@/components/WatchlistControls'
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
  const latestLevel = data.series.points.at(-1)?.level ?? null
  const trendIcon: IconName = station.trend === 'up' ? 'trend-up' : station.trend === 'down' ? 'trend-down' : 'trend-flat'
  const subtitle = station.location?.area_name ? `${station.river} · ${station.location.area_name}` : station.river

  return (
    <div className="screen">
      <ScreenHeader title={station.name} subtitle={subtitle} back />

      {stale ? <StaleBanner cachedAt={cachedAt} /> : null}

      <section className="gauge-card">
        <div className="gauge-readout">
          <span className="gauge-value readout">{fmtInt(station.discharge)}</span>
          <span className="gauge-unit">cusecs</span>
          <span className={'gauge-trend trend-' + station.trend}>
            <Icon name={trendIcon} size={20} />
          </span>
        </div>
        <div className="gauge-meta">
          <SeverityChip status={station.status} />
          <span className="gauge-time">{station.observed_at ? fmtRelative(station.observed_at) : ''}</span>
        </div>
        {latestLevel != null ? (
          <div className="gauge-sub">River level <span className="readout">{latestLevel.toFixed(2)}</span> m</div>
        ) : null}
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

      <WatchlistControls stationId={station.id} />
    </div>
  )
}
