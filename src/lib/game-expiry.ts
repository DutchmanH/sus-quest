import { GAME_INACTIVITY_TTL_MS, SESSION_TTL_MS } from '@/lib/game-config'

type TimestampInput = string | null | undefined

function toTimestampMs(value: TimestampInput): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function isSessionExpired(createdAt: TimestampInput): boolean {
  const createdMs = toTimestampMs(createdAt)
  if (!createdMs) return false
  return Date.now() - createdMs > SESSION_TTL_MS
}

export function isGameExpired(lastActivityAt: TimestampInput): boolean {
  const activityMs = toTimestampMs(lastActivityAt)
  if (!activityMs) return false
  return Date.now() - activityMs > GAME_INACTIVITY_TTL_MS
}

export function getLatestActivityTimestamp(...timestamps: TimestampInput[]): string | null {
  const latest = timestamps.reduce((max, current) => {
    const currentMs = toTimestampMs(current)
    return currentMs > max ? currentMs : max
  }, 0)
  return latest ? new Date(latest).toISOString() : null
}
