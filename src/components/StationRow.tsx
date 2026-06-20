import { Link } from 'react-router-dom'
import { SeverityChip, StatusDot } from '@/components/ui'
import type { FloodStatus } from '@/types/api'
import { fmtCusecs } from '@/lib/format'

interface Props {
  id: number
  name: string
  sub: string
  discharge: number | null
  status: FloodStatus
}

/** One tappable station row, shared by Home (flows) and the Stations list. */
export default function StationRow({ id, name, sub, discharge, status }: Props) {
  return (
    <Link to={`/stations/${id}`} className="station-row link-reset">
      <StatusDot status={status} />
      <div className="station-row-main">
        <div className="station-row-name">{name}</div>
        <div className="station-row-sub">{sub}</div>
      </div>
      <div className="station-row-readout">
        <span className="readout">{fmtCusecs(discharge)}</span>
        <SeverityChip status={status} />
      </div>
    </Link>
  )
}
