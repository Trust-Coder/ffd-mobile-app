/** Display formatting helpers. River data is Pakistan local time (Asia/Karachi). */

const PK_TZ = 'Asia/Karachi'
const EM_DASH = '—'

export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return EM_DASH
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

export function fmtCusecs(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return EM_DASH
  return `${fmtInt(n)} cusecs`
}

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function fmtDateTime(iso: string | null | undefined): string {
  const d = parse(iso)
  if (!d) return EM_DASH
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: PK_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

export function fmtTimeShort(iso: string | null | undefined): string {
  const d = parse(iso)
  if (!d) return EM_DASH
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: PK_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

export function fmtRelative(iso: string | null | undefined): string {
  const d = parse(iso)
  if (!d) return ''
  const min = Math.round((Date.now() - d.getTime()) / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day} d ago`
  return fmtDateTime(iso)
}

/** Calendar-day bucket in PKT, for grouping the alerts feed (Today / Earlier). */
export function pkDayKey(iso: string | null | undefined): string {
  const d = parse(iso)
  if (!d) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: PK_TZ }).format(d) // YYYY-MM-DD
}

export function isToday(iso: string | null | undefined): boolean {
  return pkDayKey(iso) === pkDayKey(new Date().toISOString())
}
