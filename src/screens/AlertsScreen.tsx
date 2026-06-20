import ScreenHeader from '@/components/ScreenHeader'

export default function AlertsScreen() {
  return (
    <div className="screen">
      <ScreenHeader title="Alerts" subtitle="The in-app twin of every push notification" />
      <div className="placeholder-note">
        The alerts inbox (Today / Earlier grouping, unread accents, deep links to the related
        station / advisory / bulletin) reads from the public feed in <strong>Phase&nbsp;1</strong>;
        push delivery is wired in <strong>Phase&nbsp;2</strong>.
      </div>
    </div>
  )
}
