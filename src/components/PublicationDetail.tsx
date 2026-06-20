import ScreenHeader from '@/components/ScreenHeader'
import { LoadingState, ErrorState, EmptyState, StaleBanner } from '@/components/ui'
import type { ResourceState } from '@/hooks/useResource'
import type { Publication } from '@/types/api'
import { sanitizeHtml } from '@/lib/sanitize'
import { fmtDateTime } from '@/lib/format'

/**
 * Renders a single bulletin or advisory (they share one shape/table). Given the
 * loaded resource state so the two route wrappers stay tiny.
 */
export default function PublicationDetail({ title, state }: { title: string; state: ResourceState<Publication> }) {
  const { data, error, stale, cachedAt, loading, reload } = state

  return (
    <div className="screen">
      <ScreenHeader title={title} back />

      {stale ? <StaleBanner cachedAt={cachedAt} /> : null}

      {loading && !data ? (
        <LoadingState label={`Loading ${title.toLowerCase()}…`} />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <EmptyState message={`${title} not found.`} />
      ) : (
        <article className="bulletin-detail">
          <div className="bulletin-detail-head">
            <span className="bulletin-kicker">{data.type_label}</span>
            <span className="bulletin-detail-time">{fmtDateTime(data.issue_time)}</span>
          </div>
          <h2 className="bulletin-detail-title">{data.title}</h2>

          {/* Server HTML — sanitised (lib/sanitize) before rendering. */}
          {data.body ? (
            <div className="bulletin-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.body) }} />
          ) : (
            <p className="hint-text">This {data.type} is published as a document — download it below.</p>
          )}

          {data.has_file && data.download_url ? (
            <a className="btn-primary" href={data.download_url} target="_blank" rel="noopener noreferrer">
              ⬇ Download {data.original_filename ?? 'document'}
            </a>
          ) : null}
        </article>
      )}
    </div>
  )
}
