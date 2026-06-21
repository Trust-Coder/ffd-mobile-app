import type { FloodStatus } from '@/types/api'

/**
 * Maps the backend's six-level flood status enum to the app's visual language.
 *
 * Colours are APP-OWNED (the prototype palette in src/styles/tokens.css), keyed
 * off the backend `status` string — backend `status_color` values differ and
 * must not be used. EX_HIGH ("Exceptionally High") shares the top visual bucket.
 */
/** Stable key for severity-driven CSS classes (e.g. `.sev-chip.sev-high`). The
 *  top two backend levels collapse to one visual bucket ('veryhigh'). */
export type SeverityKey = 'normal' | 'low' | 'medium' | 'high' | 'veryhigh'

interface SeverityMeta {
  label: string
  /** CSS custom property name in tokens.css */
  varName: string
  /** Visual-bucket key used for `.sev-{key}` class hooks. */
  key: SeverityKey
}

const SEVERITY: Record<FloodStatus, SeverityMeta> = {
  NORMAL: { label: 'Normal', varName: '--normal', key: 'normal' },
  LOW: { label: 'Low', varName: '--low', key: 'low' },
  MEDIUM: { label: 'Medium', varName: '--medium', key: 'medium' },
  HIGH: { label: 'High', varName: '--high', key: 'high' },
  VERY_HIGH: { label: 'Very High', varName: '--veryhigh', key: 'veryhigh' },
  EX_HIGH: { label: 'Exceptionally High', varName: '--veryhigh', key: 'veryhigh' },
}

/** Display order, calmest → most severe. */
export const SEVERITY_ORDER: FloodStatus[] = ['NORMAL', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'EX_HIGH']

export function severityLabel(status: FloodStatus): string {
  return SEVERITY[status]?.label ?? status
}

/** A `var(--…)` reference usable directly in inline styles. */
export function severityColor(status: FloodStatus): string {
  return `var(${SEVERITY[status]?.varName ?? '--normal'})`
}

/** Visual-bucket key for `.sev-{key}` CSS hooks (EX_HIGH/VERY_HIGH → 'veryhigh'). */
export function severityKey(status: FloodStatus): SeverityKey {
  return SEVERITY[status]?.key ?? 'normal'
}

export function isElevated(status: FloodStatus): boolean {
  return status !== 'NORMAL'
}

/** Coerce a loose severity string (e.g. the alerts feed's lowercase "high") to a FloodStatus. */
export function statusFromLoose(value: string | null | undefined): FloodStatus {
  if (!value) return 'NORMAL'
  const upper = value.toUpperCase()
  return (SEVERITY_ORDER as string[]).includes(upper) ? (upper as FloodStatus) : 'NORMAL'
}
