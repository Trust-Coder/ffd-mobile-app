import { describe, it, expect } from 'vitest'
import { routeForAlert, routeForData, routeForDeeplink } from '@/lib/deeplink'
import type { AlertNotification } from '@/types/api'

describe('routeForDeeplink', () => {
  it('parses the ffd:// scheme', () => {
    expect(routeForDeeplink('ffd://advisory/12')).toBe('/advisories/12')
    expect(routeForDeeplink('ffd://station/5')).toBe('/stations/5')
    expect(routeForDeeplink('ffd://bulletin/7')).toBe('/bulletins/7')
  })
  it('parses the https App Link form (with trailing query/path)', () => {
    expect(routeForDeeplink('https://host/app/advisory/3?utm=wa')).toBe('/advisories/3')
    expect(routeForDeeplink('https://host/app/station/9/extra')).toBe('/stations/9')
  })
  it('returns null for unrelated or malformed URLs', () => {
    expect(routeForDeeplink('https://host/other/1')).toBeNull()
    expect(routeForDeeplink('ffd://advisory/abc')).toBeNull()
    expect(routeForDeeplink('garbage')).toBeNull()
  })
})

describe('routeForData', () => {
  it('prefers explicit numeric ids', () => {
    expect(routeForData({ station_id: 9 })).toBe('/stations/9')
    expect(routeForData({ bulletin_id: 2 })).toBe('/bulletins/2')
    expect(routeForData({ advisory_id: 4 })).toBe('/advisories/4')
  })
  it('falls back to the deeplink string (FCM payloads)', () => {
    expect(routeForData({ deeplink: 'ffd://advisory/1' })).toBe('/advisories/1')
  })
  it('returns null when nothing routes', () => {
    expect(routeForData({})).toBeNull()
    expect(routeForData(null)).toBeNull()
    expect(routeForData(undefined)).toBeNull()
  })
})

describe('routeForAlert', () => {
  it('routes from the alert data blob', () => {
    const alert: AlertNotification = {
      id: 1,
      type: 'advisory',
      scope: 'broadcast',
      title: 't',
      body: 'b',
      sent_at: '2026-06-21T00:00:00+05:00',
      data: { deeplink: 'ffd://advisory/1' },
    }
    expect(routeForAlert(alert)).toBe('/advisories/1')
  })
})
