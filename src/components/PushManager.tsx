import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { App as CapApp } from '@capacitor/app'
import { Preferences } from '@capacitor/preferences'
import { APP_VERSION, getPushPermission, pushSupported, registerForPush, requestPushPermission } from '@/lib/push'
import { heartbeat, registerDevice } from '@/lib/devices'
import { routeForData, routeForDeeplink } from '@/lib/deeplink'
import { APP_REFRESH_EVENT, PUSH_RECEIVED_EVENT } from '@/lib/events'
import { track } from '@/lib/analytics'

const PROMPT_DISMISSED_KEY = 'ffd.push.prompt_dismissed'

/** Android notification channel for flood alerts — lets FcmService target a high-importance tone. */
const FLOOD_CHANNEL_ID = 'flood_alerts'

/**
 * Owns the push lifecycle: registers the (anonymous) device token, heartbeats on
 * resume, routes notification taps, and shows a one-line rationale pre-prompt
 * before the OS permission dialog (work plan §5 first-run). Renders nothing on
 * web or once a decision is made.
 */
export default function PushManager() {
  const navigate = useNavigate()
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (!pushSupported()) return

    let cancelled = false
    const handles: PluginListenerHandle[] = []
    // Adds a listener but discards it if the effect was already cleaned up
    // (guards the async add/cleanup race, incl. React StrictMode remounts).
    const add = async (pending: Promise<PluginListenerHandle>) => {
      const handle = await pending
      if (cancelled) void handle.remove()
      else handles.push(handle)
    }

    async function init() {
      await add(
        PushNotifications.addListener('registration', (token) => {
          void registerDevice(token.value, Capacitor.getPlatform(), APP_VERSION).catch(() => {
            // best-effort; retried on next launch
          })
        }),
      )
      await add(PushNotifications.addListener('registrationError', () => {}))
      await add(
        PushNotifications.addListener('pushNotificationReceived', () => {
          window.dispatchEvent(new Event(PUSH_RECEIVED_EVENT))
        }),
      )
      await add(
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data = action.notification.data as Record<string, unknown>
          track('notification_open', { type: typeof data.type === 'string' ? data.type : 'unknown' })
          const route = routeForData(data)
          if (route) navigate(route)
        }),
      )
      // App Link / custom-scheme opens (WhatsApp https://…/app/… and ffd://…).
      // Mutually exclusive with pushNotificationActionPerformed by event source:
      // FCM taps fire the push listener; OS VIEW intents fire appUrlOpen.
      await add(
        CapApp.addListener('appUrlOpen', (event) => {
          const route = routeForDeeplink(event.url)
          if (route) navigate(route)
        }),
      )
      await add(
        CapApp.addListener('resume', () => {
          void heartbeat()
          window.dispatchEvent(new Event(APP_REFRESH_EVENT)) // refresh visible data on resume
        }),
      )

      // Distinct Android channel for flood alerts (Android-only; safe to call repeatedly).
      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: FLOOD_CHANNEL_ID,
          name: 'Flood alerts',
          description: 'Flood advisories, bulletins and station alerts',
          importance: 5,
          visibility: 1,
        }).catch(() => {})
      }

      // Cold-start deep link: app launched by an App Link / ffd:// URL.
      const launch = await CapApp.getLaunchUrl()
      if (!cancelled && launch?.url) {
        const route = routeForDeeplink(launch.url)
        if (route) navigate(route)
      }

      const permission = await getPushPermission()
      if (cancelled) return

      if (permission === 'granted') {
        await registerForPush()
        await heartbeat()
      } else if (permission === 'prompt' || permission === 'prompt-with-rationale') {
        const dismissed = (await Preferences.get({ key: PROMPT_DISMISSED_KEY })).value
        if (!dismissed && !cancelled) setShowPrompt(true)
      }
    }

    void init()

    return () => {
      cancelled = true
      handles.forEach((h) => void h.remove())
    }
  }, [navigate])

  async function enable() {
    setShowPrompt(false)
    const permission = await requestPushPermission()
    if (permission === 'granted') await registerForPush()
  }

  async function dismiss() {
    setShowPrompt(false)
    await Preferences.set({ key: PROMPT_DISMISSED_KEY, value: '1' })
  }

  if (!showPrompt) return null

  return (
    <div className="push-prompt" role="dialog" aria-label="Enable flood alerts">
      <div className="push-prompt-card">
        <strong className="push-prompt-title">Get flood alerts</strong>
        <p className="push-prompt-text">
          Allow notifications to receive flood advisories and station alerts the moment FFD issues them.
        </p>
        <div className="push-prompt-actions">
          <button type="button" className="btn-ghost" onClick={dismiss}>
            Not now
          </button>
          <button type="button" className="btn-primary push-prompt-enable" onClick={enable}>
            Enable
          </button>
        </div>
      </div>
    </div>
  )
}
