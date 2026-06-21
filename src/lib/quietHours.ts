import type { NotificationPreferences } from '@/types/api'

/** Minutes-since-midnight, "now" in Asia/Karachi (quiet hours are in server tz). */
function nowPkMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const minutes = Number(m[1]) * 60 + Number(m[2])
  return Number.isFinite(minutes) ? minutes : null
}

/** Is "now" (Asia/Karachi) within the configured quiet-hours window? Handles wrap past midnight. */
export function isQuietHoursActive(
  prefs: Pick<NotificationPreferences, 'quiet_hours_start' | 'quiet_hours_end'>,
): boolean {
  if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) return false
  const start = toMinutes(prefs.quiet_hours_start)
  const end = toMinutes(prefs.quiet_hours_end)
  if (start == null || end == null || start === end) return false
  const now = nowPkMinutes()
  return start < end ? now >= start && now < end : now >= start || now < end
}
