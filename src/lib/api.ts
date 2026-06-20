import type { ApiEnvelope, ApiError } from '@/types/api'
import { getToken } from '@/lib/auth'
import { readCache, writeCache } from '@/lib/cache'

/**
 * Thin, envelope-aware HTTP client for the FFD public app API.
 *
 * Backend convention (see docs/BACKEND-INTEGRATION.md):
 *   success → { ok: true, data }
 *   failure → { ok: false, error: { code, message, fields? } }
 *   auth-token endpoints respond FLAT (not enveloped).
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api/app/v1').replace(/\/$/, '')

export class ApiException extends Error {
  readonly code: string
  readonly fields?: Record<string, string[]>
  readonly httpStatus?: number

  constructor(error: ApiError, httpStatus?: number) {
    super(error.message)
    this.name = 'ApiException'
    this.code = error.code
    this.fields = error.fields
    this.httpStatus = httpStatus
  }
}

export interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean // attach the stored bearer token
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.auth) {
    const token = await getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    })
  } catch {
    throw new ApiException({ code: 'NETWORK_ERROR', message: 'Network unavailable.' })
  }

  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new ApiException({ code: 'SERVER_ERROR', message: 'Malformed server response.' }, res.status)
  }

  // Enveloped responses.
  if (json && typeof json === 'object' && 'ok' in json) {
    const env = json as ApiEnvelope<T>
    if (env.ok) return env.data
    throw new ApiException(env.error, res.status)
  }

  // Flat responses (auth tokens).
  if (res.ok) return json as T
  throw new ApiException({ code: 'SERVER_ERROR', message: `Request failed (${res.status}).` }, res.status)
}

export interface CachedResult<T> {
  data: T
  stale: boolean // true when served from cache after a failed network call
  cachedAt?: string
}

/**
 * Offline-tolerant GET: network-first, falling back to the last cached payload.
 * Throws only when the request fails AND there is nothing cached.
 */
export async function cachedGet<T>(
  path: string,
  cacheKey: string,
  opts: RequestOptions = {},
): Promise<CachedResult<T>> {
  try {
    const data = await apiRequest<T>(path, { ...opts, method: 'GET' })
    await writeCache(cacheKey, data)
    return { data, stale: false }
  } catch (err) {
    const cached = await readCache<T>(cacheKey)
    if (cached) return { data: cached.data, stale: true, cachedAt: cached.at }
    throw err
  }
}
