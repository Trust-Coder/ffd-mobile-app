import { describe, it, expect } from 'vitest'
import { isSafeHttpUrl, sanitizeHtml } from '@/lib/sanitize'

describe('isSafeHttpUrl', () => {
  it('accepts absolute http/https URLs', () => {
    expect(isSafeHttpUrl('https://host/bulletin/7.pdf')).toBe(true)
    expect(isSafeHttpUrl('http://host')).toBe(true)
  })
  it('rejects dangerous schemes and junk', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('intent://evil')).toBe(false)
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false)
    expect(isSafeHttpUrl('#')).toBe(false)
    expect(isSafeHttpUrl('')).toBe(false)
    expect(isSafeHttpUrl(null)).toBe(false)
    expect(isSafeHttpUrl(undefined)).toBe(false)
  })
})

describe('sanitizeHtml', () => {
  it('strips <script> and event handlers', () => {
    const out = sanitizeHtml('<p onclick="x()">hi<script>alert(1)</script></p>')
    expect(out).toContain('hi')
    expect(out).not.toContain('<script')
    expect(out.toLowerCase()).not.toContain('onclick')
  })
  it('drops javascript: hrefs', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>')
    expect(out).not.toContain('javascript:')
  })
  it('keeps allowed formatting tags', () => {
    const out = sanitizeHtml('<p><strong>bold</strong> and <em>italic</em></p>')
    expect(out).toContain('<strong>')
    expect(out).toContain('<em>')
  })
})
