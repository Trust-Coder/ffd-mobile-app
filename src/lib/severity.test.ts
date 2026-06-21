import { describe, it, expect } from 'vitest'
import { isElevated, severityLabel, statusFromLoose } from '@/lib/severity'

describe('statusFromLoose', () => {
  it('upper-cases known lowercase severities (alerts feed)', () => {
    expect(statusFromLoose('high')).toBe('HIGH')
    expect(statusFromLoose('very_high')).toBe('VERY_HIGH')
    expect(statusFromLoose('NORMAL')).toBe('NORMAL')
  })
  it('coerces unknown/empty to NORMAL', () => {
    expect(statusFromLoose('weird')).toBe('NORMAL')
    expect(statusFromLoose(null)).toBe('NORMAL')
    expect(statusFromLoose(undefined)).toBe('NORMAL')
  })
})

describe('severityLabel', () => {
  it('labels the six levels', () => {
    expect(severityLabel('NORMAL')).toBe('Normal')
    expect(severityLabel('EX_HIGH')).toBe('Exceptionally High')
  })
})

describe('isElevated', () => {
  it('is false only for NORMAL', () => {
    expect(isElevated('NORMAL')).toBe(false)
    expect(isElevated('LOW')).toBe(true)
    expect(isElevated('EX_HIGH')).toBe(true)
  })
})
