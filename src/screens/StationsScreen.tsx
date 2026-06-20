import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ScreenHeader from '@/components/ScreenHeader'
import FilterChips from '@/components/FilterChips'
import { SeverityChip, StatusDot, LoadingState, ErrorState, EmptyState, StaleBanner } from '@/components/ui'
import { useResource } from '@/hooks/useResource'
import { getStations } from '@/lib/endpoints'
import { fmtCusecs } from '@/lib/format'

const RIVERS = ['All', 'Indus', 'Jhelum', 'Chenab', 'Ravi', 'Sutlej'] as const
type RiverFilter = (typeof RIVERS)[number]

const RIVER_OPTIONS = RIVERS.map((r) => ({ value: r, label: r }))

export default function StationsScreen() {
  const { data, error, stale, cachedAt, loading, reload } = useResource(() => getStations(), [])
  const [river, setRiver] = useState<RiverFilter>('All')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? []).filter((s) => {
      if (river !== 'All' && s.river !== river) return false
      if (q && !s.name.toLowerCase().includes(q) && !(s.location ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [data, river, query])

  return (
    <div className="screen">
      <ScreenHeader title="Stations" subtitle="Indus · Jhelum · Chenab · Ravi · Sutlej" />

      <input
        type="search"
        className="search-input"
        placeholder="Search station or location…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search stations"
      />

      <FilterChips options={RIVER_OPTIONS} value={river} onChange={setRiver} ariaLabel="Filter by river" />

      {stale ? <StaleBanner cachedAt={cachedAt} /> : null}

      {loading && !data ? (
        <LoadingState label="Loading stations…" />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState message="No stations match your filters." />
      ) : (
        <ul className="station-list">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link to={`/stations/${s.id}`} className="station-row link-reset">
                <StatusDot status={s.status} />
                <div className="station-row-main">
                  <div className="station-row-name">{s.name}</div>
                  <div className="station-row-sub">
                    {s.river}
                    {s.location ? ` · ${s.location}` : ''}
                  </div>
                </div>
                <div className="station-row-readout">
                  <span className="readout">{fmtCusecs(s.latest_value)}</span>
                  <SeverityChip status={s.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
