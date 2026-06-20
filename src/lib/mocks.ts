import type {
  Advisory,
  AlertNotification,
  Bulletin,
  FloodStatus,
  SeriesPoint,
  StationDetail,
  StationSummary,
} from '@/types/api'
import { severityLabel } from '@/lib/severity'
import type { BulletinFilter } from '@/lib/endpoints'

/**
 * Dev-only fixtures so the screens render realistic data without a live backend.
 *
 * Gated on BOTH `VITE_USE_MOCKS=1` AND `import.meta.env.DEV`, so a production
 * `vite build` can never ship mock data regardless of env. Set the flag in your
 * local `.env` to preview Phase 1 screens; unset it to hit the real API.
 */
export const mockEnabled = import.meta.env.VITE_USE_MOCKS === '1' && import.meta.env.DEV

const HOUR = 3_600_000

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString()
}

function hourlySeries(base: number, amp: number, hours = 24): SeriesPoint[] {
  const pts: SeriesPoint[] = []
  for (let i = hours - 1; i >= 0; i--) {
    const v = Math.round(base + amp * Math.sin((hours - i) / 3) + amp * 0.25 * Math.cos((hours - i) / 1.7))
    pts.push({ timestamp: isoAgo(i * HOUR), value: Math.max(0, v) })
  }
  return pts
}

interface Seed {
  id: number
  name: string
  river: string
  location: string
  value: number
  status: FloodStatus
  is_dam?: boolean
  thresholds: { medium: number; high: number; very_high: number }
}

const SEEDS: Seed[] = [
  { id: 1, name: 'Tarbela', river: 'Indus', location: 'Swabi', value: 142300, status: 'NORMAL', is_dam: true, thresholds: { medium: 200000, high: 250000, very_high: 300000 } },
  { id: 2, name: 'Kalabagh', river: 'Indus', location: 'Mianwali', value: 221400, status: 'NORMAL', thresholds: { medium: 400000, high: 550000, very_high: 700000 } },
  { id: 3, name: 'Guddu', river: 'Indus', location: 'Kashmore', value: 198700, status: 'NORMAL', thresholds: { medium: 400000, high: 550000, very_high: 700000 } },
  { id: 4, name: 'Sukkur', river: 'Indus', location: 'Sukkur', value: 175300, status: 'LOW', thresholds: { medium: 400000, high: 550000, very_high: 700000 } },
  { id: 5, name: 'Marala', river: 'Chenab', location: 'Sialkot', value: 186400, status: 'MEDIUM', thresholds: { medium: 150000, high: 250000, very_high: 400000 } },
  { id: 6, name: 'Trimmu', river: 'Chenab', location: 'Jhang', value: 96500, status: 'LOW', thresholds: { medium: 150000, high: 250000, very_high: 400000 } },
  { id: 7, name: 'Balloki', river: 'Ravi', location: 'Kasur', value: 41200, status: 'NORMAL', thresholds: { medium: 90000, high: 150000, very_high: 225000 } },
  { id: 8, name: 'Sulemanki', river: 'Sutlej', location: 'Okara', value: 28600, status: 'NORMAL', thresholds: { medium: 75000, high: 150000, very_high: 200000 } },
  { id: 9, name: 'Mangla', river: 'Jhelum', location: 'Mirpur', value: 88300, status: 'NORMAL', is_dam: true, thresholds: { medium: 150000, high: 250000, very_high: 350000 } },
]

function summary(seed: Seed): StationSummary {
  return {
    id: seed.id,
    name: seed.name,
    river: seed.river,
    location: seed.location,
    latest_value: seed.value,
    unit: 'Cs',
    status: seed.status,
    status_label: severityLabel(seed.status),
    trend: seed.status === 'MEDIUM' ? 'up' : 'right',
    observed_at: isoAgo(HOUR),
  }
}

function detail(seed: Seed): StationDetail {
  const amp = Math.max(2000, Math.round(seed.value * 0.06))
  return {
    ...summary(seed),
    catchment: seed.river,
    is_dam: seed.is_dam ?? false,
    thresholds: seed.thresholds,
    series: hourlySeries(seed.value, amp),
  }
}

const BULLETINS: Bulletin[] = [
  { id: 101, title: 'Daily Flood Bulletin — Chenab rising at Marala', body: '<p>The Chenab at Marala has risen to <strong>186,400 cusecs</strong> and is expected to keep rising over the next 24 hours. All other rivers are within normal limits.</p>', severity: 'MEDIUM', issue_time: isoAgo(5 * HOUR), published_at: isoAgo(5 * HOUR), has_file: true, download_url: '#' },
  { id: 102, title: 'Daily Flood Bulletin — Indus system normal', body: '<p>Tarbela through Kotri reporting normal seasonal flows. No flood threat anticipated.</p>', severity: 'NORMAL', issue_time: isoAgo(29 * HOUR), published_at: isoAgo(29 * HOUR), has_file: true, download_url: '#' },
  { id: 103, title: 'Weekly Hydrological Summary', body: '<p>Catchment rainfall remained below normal across the upper Indus basin this week.</p>', severity: 'LOW', issue_time: isoAgo(3 * 24 * HOUR), published_at: isoAgo(3 * 24 * HOUR), has_file: false, download_url: null },
]

const ALERTS: AlertNotification[] = [
  { id: 201, type: 'station_alert', title: 'Medium Flood — Marala', body: 'Flows rose to 186,400 cusecs on the Chenab and are expected to keep rising over the next 24 hours.', severity: 'MEDIUM', data: { station_id: 5 }, sent_at: isoAgo(2 * HOUR), read_at: null },
  { id: 202, type: 'advisory', title: 'Flood advisory issued for the Chenab', body: 'A high flood risk advisory is now active for the Chenab at Marala. Tap for guidance.', severity: 'HIGH', data: { advisory_id: 1 }, sent_at: isoAgo(6 * HOUR), read_at: isoAgo(5 * HOUR) },
  { id: 203, type: 'bulletin', title: 'Daily Flood Bulletin published', body: 'The latest FFD flood bulletin is now available.', severity: 'NORMAL', data: { bulletin_id: 101 }, sent_at: isoAgo(28 * HOUR), read_at: isoAgo(20 * HOUR) },
  { id: 204, type: 'info', title: 'Indus system within normal limits', body: 'Tarbela through Kotri reporting normal seasonal flows.', severity: 'NORMAL', data: {}, sent_at: isoAgo(3 * 24 * HOUR), read_at: null },
]

const ACTIVE_ADVISORY: Advisory = {
  id: 1,
  title: 'High flood risk on the Chenab at Marala',
  body: '<p>Rising flows on the Chenab are expected to reach <strong>high flood</strong> level at Marala within 24 hours. Communities along the river between Marala and Khanki should remain alert.</p>',
  severity: 'HIGH',
  status: 'active',
  valid_from: isoAgo(6 * HOUR),
  valid_until: isoAgo(-18 * HOUR),
  rivers_affected: ['Chenab'],
  guidance: 'Avoid riverbanks and low-lying crossings. Follow instructions from local district administration.',
  published_at: isoAgo(6 * HOUR),
}

export const mocks = {
  flowsLatest: (): StationSummary[] => SEEDS.map(summary),
  stations: (): StationSummary[] => SEEDS.map(summary),
  station: (id: number): StationDetail => {
    const seed = SEEDS.find((s) => s.id === id) ?? SEEDS[0]
    return detail(seed)
  },
  activeAdvisory: (): Advisory | null => ACTIVE_ADVISORY,
  bulletins: (filter: BulletinFilter): Bulletin[] =>
    BULLETINS.filter((b) => !filter.severity || b.severity === filter.severity),
  bulletin: (id: number): Bulletin => BULLETINS.find((b) => b.id === id) ?? BULLETINS[0],
  alerts: (): AlertNotification[] => ALERTS,
}
