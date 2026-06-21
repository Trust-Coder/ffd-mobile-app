import { useRef } from 'react'
import Icon from '@/components/Icon'
import { useTheme } from '@/theme/ThemeContext'
import type { Palette } from '@/theme/ThemeContext'

interface PaletteOption {
  value: Palette
  label: string
  brand: string
  accent: string
}

// Swatches use the palette's light-mode brand + accent so they read on the picker.
const OPTIONS: PaletteOption[] = [
  { value: 'a', label: 'Teal', brand: '#0d8a96', accent: '#57c7d4' },
  { value: 'b', label: 'Indigo', brand: '#2347b8', accent: '#00b4d8' },
  { value: 'c', label: 'Slate', brand: '#2563ff', accent: '#64748b' },
]

/** Colour-palette picker (Teal / Indigo / Slate). ARIA radiogroup, arrow-key nav. */
export default function PaletteToggle() {
  const { palette, setPalette } = useTheme()
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])

  function move(index: number) {
    const next = (index + OPTIONS.length) % OPTIONS.length
    setPalette(OPTIONS[next].value)
    btnRefs.current[next]?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      move(index + 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      move(index - 1)
    }
  }

  return (
    <div className="palette-toggle" role="radiogroup" aria-label="Colour theme">
      {OPTIONS.map((opt, i) => {
        const checked = palette === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            ref={(el) => {
              btnRefs.current[i] = el
            }}
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={'palette-opt' + (checked ? ' active' : '')}
            onClick={() => setPalette(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <span
              className="palette-swatch"
              style={{ background: `linear-gradient(135deg, ${opt.brand} 0 58%, ${opt.accent} 58% 100%)` }}
              aria-hidden="true"
            >
              {checked ? <Icon name="check" size={15} /> : null}
            </span>
            <span className="palette-label">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
