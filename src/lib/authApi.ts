import { apiRequest } from '@/lib/api'
import type { AuthTokenResponse, AuthUser } from '@/types/api'
import { getDeviceName } from '@/lib/install'
import { mockAuth, mockEnabled } from '@/lib/mocks'

/**
 * §B public auth. Login/register responses are FLAT (not enveloped), matching the
 * staff mobile auth convention — apiRequest returns them as-is.
 */

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export async function login(email: string, password: string): Promise<AuthTokenResponse> {
  if (mockEnabled) return mockAuth.login(email)
  const device_name = await getDeviceName()
  return apiRequest<AuthTokenResponse>('/auth/login', { method: 'POST', body: { email, password, device_name } })
}

export async function register(input: RegisterInput): Promise<AuthTokenResponse> {
  if (mockEnabled) return mockAuth.login(input.email, input.name)
  const device_name = await getDeviceName()
  return apiRequest<AuthTokenResponse>('/auth/register', { method: 'POST', body: { ...input, device_name } })
}

export async function logout(): Promise<void> {
  if (mockEnabled) return
  await apiRequest('/auth/logout', { method: 'POST', auth: true }).catch(() => {
    // best-effort; the local session is cleared regardless
  })
}

export async function forgotPassword(email: string): Promise<void> {
  if (mockEnabled) return
  await apiRequest('/auth/forgot-password', { method: 'POST', body: { email } })
}

export async function fetchMe(): Promise<AuthUser> {
  if (mockEnabled) return mockAuth.me()
  // GET /me is enveloped as { ok, data: { user } } (0004).
  const data = await apiRequest<{ user: AuthUser }>('/me', { auth: true })
  return data.user
}
