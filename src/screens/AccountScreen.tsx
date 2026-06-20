import ScreenHeader from '@/components/ScreenHeader'

export default function AccountScreen() {
  return (
    <div className="screen">
      <ScreenHeader title="Account" subtitle="Sign in to personalise your alerts" />
      <div className="placeholder-note">
        Login / registration, My&nbsp;Stations (watchlist), notification preferences and history
        arrive in <strong>Phase&nbsp;3</strong>. Public data and the alerts feed work without an
        account.
      </div>
    </div>
  )
}
