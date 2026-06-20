import DOMPurify from 'dompurify'

/**
 * Sanitises server-authored HTML (bulletin/advisory bodies) before rendering.
 * The content is first-party (FFD CMS) but we sanitise defensively — a hardening
 * requirement before any externally-sourced content ever reaches the same path.
 */

// Force external links to open safely.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a',
  'h1', 'h2', 'h3', 'h4', 'span', 'div', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
]

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * True only for absolute http(s) URLs. Guards server-controlled URLs (e.g.
 * bulletin download_url) before they reach an href — blocks javascript:/intent:/file:.
 */
export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}
