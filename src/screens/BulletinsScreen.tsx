import { Link } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import { LoadingState, ErrorState, EmptyState, StaleBanner } from '@/components/ui'
import { useResource } from '@/hooks/useResource'
import { getBulletins } from '@/lib/endpoints'
import { fmtDateTime } from '@/lib/format'

export default function BulletinsScreen() {
  const { data, error, stale, cachedAt, loading, reload } = useResource(() => getBulletins(), [])
  const bulletins = data ?? []

  return (
    <div className="screen">
      <ScreenHeader title="Bulletins" subtitle="FFD daily flood bulletins" />

      {stale ? <StaleBanner cachedAt={cachedAt} /> : null}

      {loading && !data ? (
        <LoadingState label="Loading bulletins…" />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : bulletins.length === 0 ? (
        <EmptyState message="No bulletins published yet." />
      ) : (
        <ul className="bulletin-list">
          {bulletins.map((b) => (
            <li key={b.id}>
              <Link to={`/bulletins/${b.id}`} className="bulletin-card link-reset">
                <div className="bulletin-card-head">
                  <span className="bulletin-kicker">{b.type_label}</span>
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
