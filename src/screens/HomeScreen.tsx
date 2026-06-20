import ScreenHeader from '@/components/ScreenHeader'

export default function HomeScreen() {
  return (
    <div className="screen">
      <ScreenHeader title="FFD Flood" subtitle="Flood Forecasting Division · Pakistan" />

      <section className="advisory-card" aria-label="Flood advisory">
        <div className="advisory-head">
          <span className="advisory-badge">Advisory</span>
          <span className="advisory-state">None active</span>
        </div>
        <p className="advisory-body">
          No flood advisory is currently in force. River conditions are within normal limits.
        </p>
      </section>

      <section className="ribbon">
        <span className="ribbon-dot" />
        Rivers within normal limits
      </section>

      <div className="placeholder-note">
        Live dashboard data (active advisory, river flows, latest bulletin) arrives in{' '}
        <strong>Phase&nbsp;1</strong>, once the public API (<code>backend/0001</code>) ships. The app
        shell, 5-tab navigation, design system and API/cache layer are in place.
      </div>
    </div>
  )
}
