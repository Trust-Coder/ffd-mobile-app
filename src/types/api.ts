/**
 * API contract types for the FFD public app surface.
 *
 * These mirror the PROPOSED contract in `backend/0001-public-api-kickoff.md`.
 * Treat them as provisional until the backend ships that request — update here
 * (the single source of truth for the client) when the real shapes land.
 */

// ── Envelope ───────────────────────────────────────────────────────────────
export type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export interface ApiError {
  code: string
  message: string
  fields?: Record<string, string[]>
}

// ── Domain primitives ──────────────────────────────────────────────────────
/** Backend is canonical: SIX levels. The UI collapses EX_HIGH into the top bucket. */
export type FloodStatus = 'NORMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | 'EX_HIGH'
export type Trend = 'up' | 'down' | 'right'
export type River = 'Indus' | 'Jhelum' | 'Chenab' | 'Ravi' | 'Sutlej'

// ── Cursor pagination (keyset, never page numbers) ─────────────────────────
export interface CursorMeta {
  count: number
  per_page: number
  next_cursor: string | null
  has_more: boolean
  server_time: string
}
export interface Paginated<T> {
  items: T[]
  meta: CursorMeta
}

// ── Stations / flows ───────────────────────────────────────────────────────
export interface StationSummary {
  id: number
  name: string
  river: string
  location?: string | null
  latest_value: number | null
  unit: string // e.g. "Cs" (cusecs)
  status: FloodStatus
  status_label: string
  trend?: Trend
  observed_at?: string | null // ISO 8601 with offset
}

export interface StationThresholds {
  medium?: number | null
  high?: number | null
  very_high?: number | null
}

export interface SeriesPoint {
  timestamp: string // ISO 8601 with offset
  value: number
}

export interface StationDetail extends StationSummary {
  catchment?: string | null
  is_dam?: boolean
  thresholds?: StationThresholds
  series?: SeriesPoint[] // recent readings for the 24h chart
}

// ── Bulletins & advisories ─────────────────────────────────────────────────
export interface Bulletin {
  id: number
  uuid?: string
  title: string
  body?: string | null // HTML; null for file-only publications
  severity?: FloodStatus | null
  issue_time: string
  published_at?: string | null
  has_file?: boolean
  download_url?: string | null
}

export interface Advisory {
  id: number
  title: string
  body?: string | null
  severity?: FloodStatus | null
  status: 'active' | 'expired' | 'draft'
  valid_from?: string | null
  valid_until?: string | null
  rivers_affected?: string[]
  guidance?: string | null
  published_at?: string | null
}

// ── Notifications / alerts inbox ───────────────────────────────────────────
export type AlertType = 'advisory' | 'bulletin' | 'station_alert' | 'info'

export interface AlertNotification {
  id: number
  type: AlertType
  title: string
  body: string
  severity?: FloodStatus | null
  data?: Record<string, unknown> // advisory_id / bulletin_id / station_id / deeplink
  sent_at: string
  read_at?: string | null
}

// ── Auth ───────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: number
  name: string
  email: string
}

/** Flat (not enveloped) — matches the staff mobile auth convention. */
export interface AuthTokenResponse {
  token: string
  token_type: string
  expires_at?: string | null
  user: AuthUser
}
