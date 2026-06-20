export interface ChipOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: ChipOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
}

export default function FilterChips<T extends string>({ options, value, onChange, ariaLabel }: Props<T>) {
  return (
    <div className="filter-chips" role="tablist" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={opt.value === value}
          className={'chip' + (opt.value === value ? ' active' : '')}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
