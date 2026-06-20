/**
 * API contract types for the FFD public app surface (`/api/app/v1`).
 *
 * AUTHORITATIVE as shipped — see `backend/0001-public-api-kickoff.response.md`
 * (§A served & tested 2026-06-21). This file is the single client-side source of
 * truth; reconcile here when the backend revises a shape.
 */

// ── Envelope ───────────────────────────────────────────────────────────────
export type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export interface ApiError {
  code: string
  message: string
  fields?: Record<string, string[]>
}

// ── Domain primitives ──────────────────────────────────────────────────────
/** Six-level flood status; `status_id` is its 0..5 ordinal (NORMAL..EX_HIGH). */
export type FloodStatus = 'NORMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | 'EX_HIGH'
export type Trend = 'up' | 'down' | 'right'

// ── Cursor pagination (paginated lists only: bulletins, advisories, alerts) ─
export interface CursorMeta {
  count: number
  per_page: number
  next_cursor: string | null
  has_more: boolean
  server_time: string
  /** Present on the §D inbox (/me/alerts) meta — total unread across all pages. */
  unread_count?: number
}
export interface Paginated<T> {
  items: T[]
  meta: CursorMeta
}

// ── Stations / flows ───────────────────────────────────────────────────────
export interface StationLocation {
  latitude: number | null
  longitude: number | null
  area_name: string | null
}

/** Full station shape — `/stations` list items and `stations/{id}.station`. */
export interface Station {
  id: number
  name: string
  river: string
  is_dam: boolean
  location: StationLocation | null
  status: FloodStatus
  status_id: number
  inflow_discharge: number | null
  outflow_discharge: number | null
  /** outflow ?? inflow — the headline figure (cusecs). */
  discharge: number | null
  inflow_trend: Trend
  outflow_trend: Trend
  trend: Trend
  dam_level: number | null // feet, dams only
  observed_at: string | null // ISO 8601 +05:00
}

/** Trimmed `/flows/latest` item — note `station_id` (not `id`). */
export interface FlowLatest {
  station_id: number
  name: string
  river: string
  discharge: number | null
  status: FloodStatus
  status_id: number
  trend: Trend
  observed_at: string | null
}

export interface StationThreshold {
  level: FloodStatus
  status_id: number
  min_discharge: number | null // cusecs; draw reference lines off this
}

export interface SeriesPoint {
  t: string // ISO 8601 +05:00
  inflow: number | null
  outflow: number | null
  level: number | null
  dam_level: number | null
  status: FloodStatus
}

export interface StationSeries {
  hours: number
  from: string
  to: string
  points: SeriesPoint[]
}

export interface StationDetail {
  station: Station
  thresholds: StationThreshold[] // ascending by min_discharge
  series: StationSeries
}

// ── Publications (bulletins & advisories share one shape/table) ────────────
export type PublicationType = 'bulletin' | 'advisory'

export interface Publication {
  id: number
  type: PublicationType
  type_label: string
  title: string
  body: string | null // frozen published HTML; null for PDF-only → use download_url
  issue_time: string
  published_at: string | null
  has_file: boolean
  original_filename: string | null
  download_url: string | null // null if no file
}

export type Bulletin = Publication
export type Advisory = Publication

// ── Notifications / alerts ─────────────────────────────────────────────────
export type AlertType = 'advisory' | 'bulletin' | 'station_alert' | 'info'
export type AlertScope = 'broadcast' | 'user' | 'station'

export interface AlertData {
  deeplink?: string // e.g. "ffd://advisory/1"
  station_id?: number
  bulletin_id?: number
  advisory_id?: number
  [key: string]: unknown
}

export interface AlertNotification {
  id: number
  type: AlertType
  scope: AlertScope
  title: string
  body: string
  severity?: string | null // lowercase: normal|low|medium|high|very_high|ex_high
  data?: AlertData
  sent_at: string
  /** Present only on the authenticated §D inbox; absent on the public feed. */
  read_at?: string | null
}

// ── Auth (§B) ──────────────────────────────────────────────────────────────
export interface AuthUser {
  id: number
  name: string
  email: string
}

/** Flat (not enveloped), matching the staff mobile auth convention. */
export interface AuthTokenResponse {
  token: string
  token_type: string
  expires_at?: string | null
  user: AuthUser
}

// ── Personalization (§D / §E — provisional, reconcile on backend/0004) ──────
/** A watchlisted station: the full station plus the per-station alert toggle. */
export interface WatchlistStation extends Station {
  alert_enabled: boolean
}

export interface NotificationPreferences {
  bulletins_enabled: boolean
  advisory_enabled: boolean
  watchlist_alerts_enabled: boolean
  min_severity: FloodStatus
  quiet_hours_start: string | null // "HH:MM", Asia/Karachi
  quiet_hours_end: string | null
}
