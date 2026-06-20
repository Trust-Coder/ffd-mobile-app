import type {
  Advisory,
  AlertNotification,
  AuthTokenResponse,
  AuthUser,
  Bulletin,
  FloodStatus,
  FlowLatest,
  NotificationPreferences,
  Publication,
  SeriesPoint,
  Station,
  StationDetail,
  StationThreshold,
  Trend,
  WatchlistStation,
} from '@/types/api'
import { SEVERITY_ORDER } from '@/lib/severity'

/**
 * Dev-only fixtures matching the shipped §A shapes, so screens render without a
 * live backend. Gated on BOTH `VITE_USE_MOCKS=1` AND `import.meta.env.DEV`, so a
 * production `vite build` can never ship them.
 */
export const mockEnabled = import.meta.env.VITE_USE_MOCKS === '1' && import.meta.env.DEV

const HOUR = 3_600_000

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString()
}

function statusId(status: FloodStatus): number {
  return SEVERITY_ORDER.indexOf(status)
}

interface Seed {
  id: number
  name: string
  river: string
  area: string
  discharge: number
  status: FloodStatus
  trend: Trend
  is_dam?: boolean
  thr: { low: number; medium: number; high: number; very_high: number }
}

const SEEDS: Seed[] = [
  { id: 1, name: 'Tarbela', river: 'Indus', area: 'Swabi', discharge: 142300, status: 'NORMAL', trend: 'right', is_dam: true, thr: { low: 120000, medium: 200000, high: 250000, very_high: 300000 } },
  { id: 2, name: 'Kalabagh', river: 'Indus', area: 'Mianwali', discharge: 221400, status: 'NORMAL', trend: 'right', thr: { low: 250000, medium: 400000, high: 550000, very_high: 700000 } },
  { id: 3, name: 'Guddu', river: 'Indus', area: 'Kashmore', discharge: 198700, status: 'NORMAL', trend: 'right', thr: { low: 250000, medium: 400000, high: 550000, very_high: 700000 } },
  { id: 4, name: 'Sukkur', river: 'Indus', area: 'Sukkur', discharge: 275300, status: 'LOW', trend: 'up', thr: { low: 250000, medium: 400000, high: 550000, very_high: 700000 } },
  { id: 5, name: 'Marala', river: 'Chenab', area: 'Sialkot', discharge: 186400, status: 'MEDIUM', trend: 'up', thr: { low: 100000, medium: 150000, high: 250000, very_high: 400000 } },
  { id: 6, name: 'Trimmu', river: 'Chenab', area: 'Jhang', discharge: 112500, status: 'LOW', trend: 'up', thr: { low: 100000, medium: 150000, high: 250000, very_high: 400000 } },
  { id: 7, name: 'Balloki', river: 'Ravi', area: 'Kasur', discharge: 41200, status: 'NORMAL', trend: 'right', thr: { low: 60000, medium: 90000, high: 150000, very_high: 225000 } },
  { id: 8, name: 'Sulemanki', river: 'Sutlej', area: 'Okara', discharge: 28600, status: 'NORMAL', trend: 'right', thr: { low: 50000, medium: 75000, high: 150000, very_high: 200000 } },
  { id: 9, name: 'Mangla', river: 'Jhelum', area: 'Mirpur', discharge: 88300, status: 'NORMAL', trend: 'right', is_dam: true, thr: { low: 100000, medium: 150000, high: 250000, very_high: 350000 } },
]

function thresholds(seed: Seed): StationThreshold[] {
  return [
    { level: 'LOW' as const, value: seed.thr.low },
    { level: 'MEDIUM' as const, value: seed.thr.medium },
    { level: 'HIGH' as const, value: seed.thr.high },
    { level: 'VERY_HIGH' as const, value: seed.thr.very_high },
  ].map((t) => ({ level: t.level, status_id: statusId(t.level), min_discharge: t.value }))
}

function statusForValue(value: number, seed: Seed): FloodStatus {
  if (value >= seed.thr.very_high) return 'VERY_HIGH'
  if (value >= seed.thr.high) return 'HIGH'
  if (value >= seed.thr.medium) return 'MEDIUM'
  if (value >= seed.thr.low) return 'LOW'
  return 'NORMAL'
}

function station(seed: Seed): Station {
  const inflow = Math.round(seed.discharge * 0.92)
  return {
    id: seed.id,
    name: seed.name,
    river: seed.river,
    is_dam: seed.is_dam ?? false,
    location: { latitude: null, longitude: null, area_name: seed.area },
    status: seed.status,
    status_id: statusId(seed.status),
    inflow_discharge: inflow,
    outflow_discharge: seed.discharge,
    discharge: seed.discharge,
    inflow_trend: seed.trend,
    outflow_trend: seed.trend,
    trend: seed.trend,
    dam_level: seed.is_dam ? 1550 : null,
    observed_at: isoAgo(HOUR),
  }
}

function flow(seed: Seed): FlowLatest {
  return {
    station_id: seed.id,
    name: seed.name,
    river: seed.river,
    discharge: seed.discharge,
    status: seed.status,
    status_id: statusId(seed.status),
    trend: seed.trend,
    observed_at: isoAgo(HOUR),
  }
}

function series(seed: Seed): SeriesPoint[] {
  const amp = Math.max(2000, Math.round(seed.discharge * 0.06))
  const pts: SeriesPoint[] = []
  for (let i = 23; i >= 0; i--) {
    const outflow = Math.max(0, Math.round(seed.discharge + amp * Math.sin((24 - i) / 3) + amp * 0.25 * Math.cos((24 - i) / 1.7)))
    pts.push({
      t: isoAgo(i * HOUR),
      inflow: Math.round(outflow * 0.92),
      outflow,
      level: null,
      dam_level: seed.is_dam ? 1550 : null,
      status: statusForValue(outflow, seed),
    })
  }
  return pts
}

function detail(seed: Seed): StationDetail {
  return {
    station: station(seed),
    thresholds: thresholds(seed),
    series: { hours: 24, from: isoAgo(23 * HOUR), to: isoAgo(0), points: series(seed) },
  }
}

function bulletin(over: Partial<Bulletin> & Pick<Bulletin, 'id' | 'title'>): Bulletin {
  return {
    type: 'bulletin',
    type_label: 'Bulletin',
    body: null,
    severity: null,
    issue_time: isoAgo(5 * HOUR),
    published_at: isoAgo(5 * HOUR),
    valid_until: null,
    lifecycle: null,
    rivers_affected: null,
    guidance: null,
    has_file: false,
    original_filename: null,
    download_url: null,
    ...over,
  }
}

const BULLETINS: Bulletin[] = [
  bulletin({ id: 101, title: 'Daily Flood Bulletin — Chenab rising at Marala', severity: 'MEDIUM', body: '<p>The Chenab at Marala has risen to <strong>186,400 cusecs</strong> and is expected to keep rising over the next 24 hours. All other rivers are within normal limits.</p>', has_file: true, original_filename: 'daily-bulletin.pdf', download_url: 'https://example.com/bulletin/101.pdf' }),
  bulletin({ id: 102, title: 'Daily Flood Bulletin — Indus system normal', severity: 'NORMAL', body: '<p>Tarbela through Kotri reporting normal seasonal flows. No flood threat anticipated.</p>', issue_time: isoAgo(29 * HOUR), published_at: isoAgo(29 * HOUR), has_file: true, original_filename: 'daily-bulletin.pdf', download_url: 'https://example.com/bulletin/102.pdf' }),
  bulletin({ id: 103, title: 'Weekly Hydrological Summary', severity: 'LOW', body: '<p>Catchment rainfall remained below normal across the upper Indus basin this week.</p>', issue_time: isoAgo(3 * 24 * HOUR), published_at: isoAgo(3 * 24 * HOUR) }),
]

const ADVISORIES: Advisory[] = [
  { id: 201, type: 'advisory', type_label: 'Advisory', title: 'High flood risk on the Chenab at Marala', body: '<p>Rising flows on the Chenab are expected to reach <strong>high flood</strong> level at Marala within 24 hours.</p>', severity: 'HIGH', issue_time: isoAgo(6 * HOUR), published_at: isoAgo(6 * HOUR), valid_until: isoAgo(-18 * HOUR), lifecycle: 'active', rivers_affected: ['Chenab', 'Jhelum'], guidance: 'Move livestock and valuables to higher ground. Avoid riverbanks and low-lying crossings between Marala and Khanki. Follow instructions from the district administration.', has_file: true, original_filename: 'advisory.pdf', download_url: 'https://example.com/advisory/201.pdf' },
  { id: 202, type: 'advisory', type_label: 'Advisory', title: 'Seasonal flood outlook — monsoon onset', body: '<p>The monsoon is expected to establish over the upper catchments next week. Routine vigilance advised.</p>', severity: 'LOW', issue_time: isoAgo(10 * 24 * HOUR), published_at: isoAgo(10 * 24 * HOUR), valid_until: null, lifecycle: 'expired', rivers_affected: null, guidance: null, has_file: false, original_filename: null, download_url: null },
]

const ALERTS: AlertNotification[] = [
  { id: 301, type: 'station_alert', scope: 'broadcast', title: 'Medium Flood — Marala', body: 'Flows rose to 186,400 cusecs on the Chenab and are expected to keep rising over the next 24 hours.', severity: 'medium', data: { station_id: 5, deeplink: 'ffd://station/5' }, sent_at: isoAgo(2 * HOUR) },
  { id: 302, type: 'advisory', scope: 'broadcast', title: 'Flood advisory issued for the Chenab', body: 'A high flood risk advisory is now active for the Chenab at Marala. Tap for guidance.', severity: 'high', data: { advisory_id: 201, deeplink: 'ffd://advisory/201' }, sent_at: isoAgo(6 * HOUR) },
  { id: 303, type: 'bulletin', scope: 'broadcast', title: 'Daily Flood Bulletin published', body: 'The latest FFD flood bulletin is now available.', severity: 'normal', data: { bulletin_id: 101, deeplink: 'ffd://bulletin/101' }, sent_at: isoAgo(28 * HOUR) },
  { id: 304, type: 'info', scope: 'broadcast', title: 'Indus system within normal limits', body: 'Tarbela through Kotri reporting normal seasonal flows.', severity: 'normal', data: {}, sent_at: isoAgo(3 * 24 * HOUR) },
]

const ALL_PUBLICATIONS: Publication[] = [...BULLETINS, ...ADVISORIES]

// ── Personalization fixtures (mutable so add/remove/toggle reflect in dev) ───
const DEMO_USER: AuthUser = { id: 1, name: 'Demo User', email: 'demo@ffd.gov.pk' }

const watchlistIds = new Set<number>([5, 1]) // Marala, Tarbela
const alertEnabled = new Map<number, boolean>([
  [5, true],
  [1, false],
])

let prefs: NotificationPreferences = {
  bulletins_enabled: true,
  advisory_enabled: true,
  watchlist_alerts_enabled: true,
  min_severity: 'MEDIUM',
  quiet_hours_start: null,
  quiet_hours_end: null,
}

// The authed inbox = the broadcast feed with per-user read state layered on.
const inbox: AlertNotification[] = ALERTS.map((a, i) => ({ ...a, scope: 'broadcast', read_at: i < 1 ? null : a.sent_at }))

export const mocks = {
  flowsLatest: (): FlowLatest[] => SEEDS.map(flow),
  stations: (): Station[] => SEEDS.map(station),
  station: (id: number): StationDetail => detail(SEEDS.find((s) => s.id === id) ?? SEEDS[0]),
  activeAdvisory: (): Advisory | null => ADVISORIES[0],
  bulletins: (severity?: string): Bulletin[] =>
    severity ? BULLETINS.filter((b) => b.severity === severity) : BULLETINS,
  publication: (id: number): Publication => ALL_PUBLICATIONS.find((p) => p.id === id) ?? ALL_PUBLICATIONS[0],
  alerts: (): AlertNotification[] => ALERTS,

  inbox: (): AlertNotification[] => inbox,
  markRead: (id: number): void => {
    const item = inbox.find((a) => a.id === id)
    if (item) item.read_at = new Date().toISOString()
  },
  watchlist: (): WatchlistStation[] =>
    SEEDS.filter((s) => watchlistIds.has(s.id)).map((s) => ({ ...station(s), alert_enabled: alertEnabled.get(s.id) ?? true })),
  addWatch: (id: number): void => {
    watchlistIds.add(id)
    if (!alertEnabled.has(id)) alertEnabled.set(id, true)
  },
  removeWatch: (id: number): void => {
    watchlistIds.delete(id)
  },
  isWatched: (id: number): boolean => watchlistIds.has(id),
  setAlert: (id: number, enabled: boolean): void => {
    alertEnabled.set(id, enabled)
  },
  preferences: (): NotificationPreferences => prefs,
  setPreferences: (next: NotificationPreferences): void => {
    prefs = next
  },
}

export const mockAuth = {
  login: (email: string, name?: string): AuthTokenResponse => ({
    token: 'mock-token',
    token_type: 'Bearer',
    expires_at: null,
    user: { ...DEMO_USER, email, name: name ?? DEMO_USER.name },
  }),
  me: (): AuthUser => DEMO_USER,
}
