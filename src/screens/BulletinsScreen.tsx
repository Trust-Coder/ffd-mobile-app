import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import FilterChips from '@/components/FilterChips'
import { SeverityChip, LoadingState, ErrorState, EmptyState, StaleBanner } from '@/components/ui'
import { usePaginated } from '@/hooks/usePaginated'
import { getBulletinsPage } from '@/lib/endpoints'
import { severityColor } from '@/lib/severity'
import { fmtDateTime } from '@/lib/format'

const SEVERITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'EX_HIGH', label: 'Exceptional' },
  { value: 'VERY_HIGH', label: 'Very High' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
]

export default function BulletinsScreen() {
  const [severity, setSeverity] = useState('')
  const { items, error, loadMoreError, stale, cachedAt, loading, loadingMore, hasMore, reload, loadMore } =
    usePaginated((cursor) => getBulletinsPage({ severity: severity || undefined }, cursor), [severity])
  const bulletins = items

  return (
    <div className="screen">
      <ScreenHeader title="Bulletins" subtitle="FFD daily flood bulletins" />

      <FilterChips options={SEVERITY_OPTIONS} value={severity} onChange={setSeverity} ariaLabel="Filter bulletins by severity" />

      {stale ? <StaleBanner cachedAt={cachedAt} /> : null}

      {loading && !bulletins.length ? (
        <LoadingState label="Loading bulletins…" />
      ) : error && !bulletins.length ? (
        <ErrorState message={error} onRetry={reload} />
      ) : bulletins.length === 0 ? (
        <EmptyState message="No bulletins match this filter." />
      ) : (
        <>
          <ul className="bulletin-list">
            {bulletins.map((b) => (
              <li key={b.id}>
                <Link
                  to={`/bulletins/${b.id}`}
                  className="bulletin-card link-reset"
                  style={b.severity ? ({ '--accent': severityColor(b.severity) } as CSSProperties) : undefined}
                >
                  <div className="bulletin-card-head">
                    {b.severity ? <SeverityChip status={b.severity} /> : <span className="bulletin-kicker">{b.type_label}</span>}
                    <span className="bulletin-card-time">{fmtDateTime(b.issue_time)}</span>
                  </div>
                  <div className="bulletin-card-title">{b.title}</div>
                  {b.has_file ? <span className="bulletin-card-file">PDF available</span> : null}
                </Link>
              </li>
            ))}
          </ul>
          {hasMore ? (
            <button type="button" className="btn-ghost block load-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          ) : (
            <p className="list-end">You’re all caught up.</p>
          )}
          {loadMoreError ? (
            <p className="error-text load-more-error" role="alert">
              {loadMoreError}{' '}
              <button type="button" className="link-btn" onClick={loadMore}>
                Retry
              </button>
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
