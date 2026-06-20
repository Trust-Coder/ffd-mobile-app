import { Preferences } from '@capacitor/preferences'

/**
 * Last-successful-payload cache for offline tolerance. Each screen reads through
 * `cachedGet` (see lib/api.ts): on a network failure the app renders the last
 * good payload (flagged stale) instead of an error.
 */
const PREFIX = 'ffd.cache.'

interface CacheEntry<T> {
  at: string // ISO timestamp the payload was stored
  data: T
}

export async function readCache<T>(key: string): Promise<{ data: T; at: string } | null> {
  const { value } = await Preferences.get({ key: PREFIX + key })
  if (!value) return null
  try {
    const entry = JSON.parse(value) as CacheEntry<T>
    return { data: entry.data, at: entry.at }
  } catch {
    return null
  }
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { at: new Date().toISOString(), data }
  await Preferences.set({ key: PREFIX + key, value: JSON.stringify(entry) })
}

export async function clearCache(): Promise<void> {
  const { keys } = await Preferences.keys()
  await Promise.all(
    keys.filter((k) => k.startsWith(PREFIX)).map((k) => Preferences.remove({ key: k })),
  )
}
