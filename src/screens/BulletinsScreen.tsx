import { useState } from 'react'
import { Link } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import FilterChips from '@/components/FilterChips'
import { SeverityChip, LoadingState, ErrorState, EmptyState, StaleBanner } from '@/components/ui'
import type { CSSProperties } from 'react'
import { useResource } from '@/hooks/useResource'
import { getBulletins } from '@/lib/endpoints'
import { severityColor } from '@/lib/severity'
import { fmtDateTime } from '@/lib/format'

const SEVERITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'VERY_HIGH', label: 'Very High' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
] as const

export default function BulletinsScreen() {
  const [severity, setSeverity] = useState('')
  const { data, error, stale, cachedAt, loading, reload } = useResource(
    () => getBulletins({ severity: severity || undefined }),
    [severity],
  )

  const bulletins = data ?? []

  return (
    <div className="screen">
      <ScreenHeader title="Bulletins" subtitle="FFD flood bulletins & reports" />

      <FilterChips
        options={SEVERITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        value={severity}
        onChange={setSeverity}
        ariaLabel="Filter bulletins by severity"
      />

      {stale ? <StaleBanner cachedAt={cachedAt} /> : null}

      {loading && !data ? (
        <LoadingState label="Loading bulletins…" />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : bulletins.length === 0 ? (
        <EmptyState message="No bulletins match this filter." />
      ) : (
        <ul className="bulletin-list">
          {bulletins.map((b) => (
            <li key={b.id}>
              <Link
                to={`/bulletins/${b.id}`}
                className="bulletin-card link-reset"
                style={b.severity ? ({ '--accent': severityColor(b.severity) } as CSSProperties) : undefined}
              >
                <div className="bulletin-card-head">
                  {b.severity ? <SeverityChip status={b.severity} /> : null}
                  <span className="bulletin-card-time">{fmtDateTime(b.issue_time)}</span>
                </div>
                <div className="bulletin-card-title">{b.title}</div>
                {b.has_file ? <span className="bulletin-card-file">PDF available</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
