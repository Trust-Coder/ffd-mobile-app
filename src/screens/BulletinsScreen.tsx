import ScreenHeader from '@/components/ScreenHeader'

export default function BulletinsScreen() {
  return (
    <div className="screen">
      <ScreenHeader title="Bulletins" subtitle="FFD flood bulletins & reports" />
      <div className="placeholder-note">
        The chronological bulletin feed with severity filter chips and a detail view (HTML body or
        PDF download) lands in <strong>Phase&nbsp;1</strong>.
      </div>
    </div>
  )
}
