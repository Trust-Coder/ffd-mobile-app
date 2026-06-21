import { describe, it, expect } from 'vitest'
import { advisoryState } from '@/lib/advisory'
import type { Advisory } from '@/types/api'

function adv(over: Partial<Advisory>): Advisory {
  return {
    id: 1,
    type: 'advisory',
    type_label: 'Advisory',
    title: 't',
    body: null,
    severity: null,
    issue_time: new Date().toISOString(),
    published_at: null,
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

describe('advisoryState', () => {
  it('honours an explicit server lifecycle', () => {
    expect(advisoryState(adv({ lifecycle: 'withdrawn' }))).toBe('withdrawn')
    expect(advisoryState(adv({ lifecycle: 'expired' }))).toBe('expired')
  })
  it('uses valid_until: future → active, past → expired', () => {
    expect(advisoryState(adv({ valid_until: new Date(Date.now() + 3_600_000).toISOString() }))).toBe('active')
    expect(advisoryState(adv({ valid_until: new Date(Date.now() - 3_600_000).toISOString() }))).toBe('expired')
  })
  it('falls back to a 24h-from-issue heuristic', () => {
    expect(advisoryState(adv({ issue_time: new Date(Date.now() - 2 * 3_600_000).toISOString() }))).toBe('active')
    expect(advisoryState(adv({ issue_time: new Date(Date.now() - 25 * 3_600_000).toISOString() }))).toBe('expired')
  })
  it('fails safe to expired on unparseable dates', () => {
    expect(advisoryState(adv({ issue_time: 'garbage', valid_until: null, lifecycle: null }))).toBe('expired')
  })
})
