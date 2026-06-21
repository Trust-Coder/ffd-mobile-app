import { describe, it, expect } from 'vitest'
import { parseRetryAfter } from '@/lib/api'

describe('parseRetryAfter', () => {
  it('parses delay-seconds', () => {
    expect(parseRetryAfter('120')).toBe(120)
    expect(parseRetryAfter('0')).toBe(0)
  })
  it('parses the HTTP-date form into seconds-to-wait', () => {
    const future = new Date(Date.now() + 60_000).toUTCString()
    const seconds = parseRetryAfter(future)
    expect(seconds).toBeGreaterThanOrEqual(57)
    expect(seconds).toBeLessThanOrEqual(61)
  })
  it('returns undefined for null/garbage', () => {
    expect(parseRetryAfter(null)).toBeUndefined()
    expect(parseRetryAfter('not-a-date')).toBeUndefined()
  })
})
