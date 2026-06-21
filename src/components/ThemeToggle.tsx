import { useRef } from 'react'
import Icon from '@/components/Icon'
import type { IconName } from '@/components/Icon'
import { useTheme } from '@/theme/ThemeContext'
import type { ThemeMode } from '@/theme/ThemeContext'

interface Segment {
  value: ThemeMode
  label: string
  icon: IconName
}

const SEGMENTS: Segment[] = [
  { value: 'system', label: 'System', icon: 'settings' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
]

/**
 * Three-segment Theme control (System / Light / Dark). Implemented as an ARIA
 * radiogroup so it announces correctly and supports arrow-key navigation; each
 * segment is a 44px touch target.
 */
export default function ThemeToggle() {
  const { mode, setMode } = useTheme()
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])

  function focusAndSelect(index: number) {
    const next = (index + SEGMENTS.length) % SEGMENTS.length
    const seg = SEGMENTS[next]
    setMode(seg.value)
    btnRefs.current[next]?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        focusAndSelect(index + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        focusAndSelect(index - 1)
        break
      case 'Home':
        e.preventDefault()
        focusAndSelect(0)
        break
      case 'End':
        e.preventDefault()
        focusAndSelect(SEGMENTS.length - 1)
        break
    }
  }

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Appearance">
      {SEGMENTS.map((seg, i) => {
        const checked = mode === seg.value
        return (
          <button
            key={seg.value}
            type="button"
            ref={(el) => {
              btnRefs.current[i] = el
            }}
            className={'theme-seg' + (checked ? ' active' : '')}
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => setMode(seg.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <Icon name={seg.icon} size={18} />
            <span>{seg.label}</span>
          </button>
        )
      })}
    </div>
  )
}
