import ScreenHeader from '@/components/ScreenHeader'

export default function StationsScreen() {
  return (
    <div className="screen">
      <ScreenHeader title="Stations" subtitle="Indus · Jhelum · Chenab · Ravi · Sutlej" />
      <div className="placeholder-note">
        Station list with river filter chips, latest discharge and status — plus a station-detail
        screen with a 24-hour chart and threshold lines — land in <strong>Phase&nbsp;1</strong>.
      </div>
    </div>
  )
}
