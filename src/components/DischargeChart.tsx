import type { SeriesPoint, StationThresholds } from '@/types/api'
import { fmtInt } from '@/lib/format'

interface Props {
  series: SeriesPoint[]
  thresholds?: StationThresholds
  unit?: string
}

const W = 320
const H = 170
const PAD = { top: 12, right: 10, bottom: 18, left: 10 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

interface Line {
  value: number
  color: string
  label: string
}

/**
 * Dependency-free SVG area chart for a station's recent discharge, with the
 * Medium/High/Very-High flood threshold lines overlaid. Scales to container
 * width via a viewBox; no chart library (keeps the mobile bundle lean).
 */
export default function DischargeChart({ series, thresholds, unit = 'cusecs' }: Props) {
  if (series.length < 2) {
    return <div className="chart-empty">Not enough data to plot.</div>
  }

  const values = series.map((p) => p.value)
  const lines: Line[] = [
    thresholds?.medium != null ? { value: thresholds.medium, color: 'var(--medium)', label: 'Medium' } : null,
    thresholds?.high != null ? { value: thresholds.high, color: 'var(--high)', label: 'High' } : null,
    thresholds?.very_high != null ? { value: thresholds.very_high, color: 'var(--veryhigh)', label: 'Very High' } : null,
  ].filter((l): l is Line => l !== null)

  const dataMax = Math.max(...values)
  // Headroom: include the lowest threshold that sits just above the data so the
  // line is visible, but don't zoom all the way out to Very-High when flows are low.
  const visibleThreshold = lines.find((l) => l.value >= dataMax)?.value ?? dataMax
  const yMax = Math.max(dataMax, visibleThreshold) * 1.12 || 1
  const yMin = 0

  const x = (i: number) => PAD.left + (i / (series.length - 1)) * PLOT_W
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * PLOT_H

  const linePath = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${x(series.length - 1).toFixed(1)} ${y(yMin).toFixed(1)} L${x(0).toFixed(1)} ${y(yMin).toFixed(1)} Z`

  const last = series[series.length - 1]

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Discharge over the last 24 hours">
        <defs>
          <linearGradient id="dischargeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--water)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--water)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {lines
          .filter((l) => l.value <= yMax)
          .map((l) => (
            <g key={l.label}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(l.value)}
                y2={y(l.value)}
                stroke={l.color}
                strokeWidth="1"
                strokeDasharray="4 3"
                opacity="0.8"
              />
              <text x={W - PAD.right} y={y(l.value) - 3} textAnchor="end" className="chart-threshold-label" fill={l.color}>
                {l.label}
              </text>
            </g>
          ))}

        <path d={areaPath} fill="url(#dischargeFill)" />
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(series.length - 1)} cy={y(last.value)} r="3.5" fill="var(--primary)" stroke="#fff" strokeWidth="1.5" />
      </svg>
      <figcaption className="chart-cap">
        Last 24 hours · latest <strong>{fmtInt(last.value)}</strong> {unit}
      </figcaption>
    </figure>
  )
}
