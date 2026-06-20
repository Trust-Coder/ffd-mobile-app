import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { App as CapApp } from '@capacitor/app'
import { Preferences } from '@capacitor/preferences'
import { APP_VERSION, getPushPermission, pushSupported, registerForPush, requestPushPermission } from '@/lib/push'
import { heartbeat, registerDevice } from '@/lib/devices'
import { routeForData } from '@/lib/deeplink'

const PROMPT_DISMISSED_KEY = 'ffd.push.prompt_dismissed'

/** Foreground push → let screens (e.g. Alerts) refresh themselves. */
export const PUSH_RECEIVED_EVENT = 'ffd:push-received'

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
          const route = routeForData(action.notification.data as Record<string, unknown>)
          if (route) navigate(route)
        }),
      )
      await add(CapApp.addListener('resume', () => void heartbeat()))

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
