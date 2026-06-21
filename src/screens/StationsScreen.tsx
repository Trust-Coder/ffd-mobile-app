import { useMemo, useState } from 'react'
import ScreenHeader from '@/components/ScreenHeader'
import FilterChips from '@/components/FilterChips'
import StationRow from '@/components/StationRow'
import { LoadingState, ErrorState, EmptyState, StaleBanner } from '@/components/ui'
import { useResource } from '@/hooks/useResource'
import { getStations } from '@/lib/endpoints'

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
      if (q) {
        const haystack = `${s.name} ${s.location?.area_name ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [data, river, query])

  return (
    <div className="screen">
      <ScreenHeader title="Stations" subtitle="Indus · Jhelum · Chenab · Ravi · Sutlej" refreshable />

      <div className="search-row">
        <input
          type="search"
          className="search-input"
          placeholder="Search station or location…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search stations"
        />
        {query ? (
          <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
            ✕
          </button>
        ) : null}
      </div>

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
              <StationRow
                id={s.id}
                name={s.name}
                sub={s.location?.area_name ? `${s.river} · ${s.location.area_name}` : s.river}
                discharge={s.discharge}
                status={s.status}
                observedAt={s.observed_at}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
