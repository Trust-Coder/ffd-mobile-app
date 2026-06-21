import type { CSSProperties, ReactNode } from 'react'
import type { FloodStatus } from '@/types/api'
import { severityColor, severityKey, severityLabel } from '@/lib/severity'
import { fmtRelative } from '@/lib/format'

export function SeverityChip({ status, label }: { status: FloodStatus; label?: string }) {
  return (
    <span className={`sev-chip sev-${severityKey(status)}`} style={{ '--sev': severityColor(status) } as CSSProperties}>
      {label ?? severityLabel(status)}
    </span>
  )
}

export function StatusDot({ status }: { status: FloodStatus }) {
  // Non-colour cue for colour-blind users: the dot carries the level as a label.
  return (
    <span className="status-dot" style={{ background: severityColor(status) }} role="img" aria-label={`${severityLabel(status)} level`} />
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state-view" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-view error" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn-ghost" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="state-view empty">
      <p>{message}</p>
      {children}
    </div>
  )
}

export function StaleBanner({ cachedAt }: { cachedAt?: string }) {
  const when = cachedAt ? fmtRelative(cachedAt) : ''
  return (
    <div className="stale-banner" role="status">
      Offline — showing last update{when ? ` from ${when}` : ''}.
    </div>
  )
}
