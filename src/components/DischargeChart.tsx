import { fmtInt } from '@/lib/format'

export interface ChartPoint {
  t: string
  value: number
}

export interface ChartThreshold {
  label: string
  value: number
  color: string // a CSS colour or var(...) reference
}

interface Props {
  points: ChartPoint[]
  thresholds?: ChartThreshold[]
  unit?: string
}

const W = 320
const H = 170
const PAD = { top: 12, right: 10, bottom: 18, left: 10 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

/**
 * Dependency-free SVG area chart for a station's recent discharge, with flood
 * threshold lines overlaid. Scales to container width via a viewBox; no chart
 * library (keeps the mobile bundle lean).
 */
export default function DischargeChart({ points, thresholds = [], unit = 'cusecs' }: Props) {
  if (points.length < 2) {
    return <div className="chart-empty">Not enough data to plot.</div>
  }

  const values = points.map((p) => p.value)
  const dataMax = Math.max(...values)
  // Headroom: zoom only to the lowest threshold that sits above the data, so the
  // nearest reference line is visible without flattening the series.
  const aboveData = thresholds.map((l) => l.value).filter((v) => v >= dataMax)
  const ceiling = aboveData.length ? Math.min(...aboveData) : dataMax
  const yMax = Math.max(dataMax, ceiling) * 1.12 || 1
  const yMin = 0

  const x = (i: number) => PAD.left + (i / (points.length - 1)) * PLOT_W
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * PLOT_H

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${x(points.length - 1).toFixed(1)} ${y(yMin).toFixed(1)} L${x(0).toFixed(1)} ${y(yMin).toFixed(1)} Z`
  const last = points[points.length - 1]

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Discharge over the last 24 hours">
        <defs>
          <linearGradient id="dischargeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--water)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--water)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {thresholds
          .filter((l) => l.value <= yMax)
          .map((l) => (
            <g key={l.label}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(l.value)} y2={y(l.value)} stroke={l.color} strokeWidth="1" strokeDasharray="4 3" opacity="0.8" />
              <text x={W - PAD.right} y={y(l.value) - 3} textAnchor="end" className="chart-threshold-label" fill={l.color}>
                {l.label}
              </text>
            </g>
          ))}

        <path d={areaPath} fill="url(#dischargeFill)" />
        <path d={linePath} fill="none" stroke="var(--water)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(points.length - 1)} cy={y(last.value)} r="3.5" fill="var(--water)" stroke="var(--card)" strokeWidth="1.5" />
      </svg>
      <figcaption className="chart-cap">
        Last 24 hours · latest <strong>{fmtInt(last.value)}</strong> {unit}
      </figcaption>
    </figure>
  )
}
