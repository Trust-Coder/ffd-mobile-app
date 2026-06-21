/**
 * Minimal analytics seam. Wire to a real provider (e.g. Firebase Analytics) in
 * production. NEVER pass PII here — no FCM tokens, bearer tokens, emails.
 *
 * Per-channel delivery analytics (the work-plan §5 item) is primarily server-side
 * (which of push/inbox/WhatsApp fired, per `app_notifications.channels`); this is
 * the client half: opens and crashes.
 */
type AnalyticsProps = Record<string, string | number | boolean | null | undefined>

export function track(event: string, props: AnalyticsProps = {}): void {
  if (import.meta.env.DEV) {
    console.debug('[analytics]', event, props)
  }
  // TODO(prod): forward to the analytics provider.
}
