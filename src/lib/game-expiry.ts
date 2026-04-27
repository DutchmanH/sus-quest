import { SESSION_TTL_MS, STATUS_INACTIVITY_TTL_MS } from '@/lib/game-config'

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

export function isRoomExpired(room: {
  created_at: string
  last_activity_at: string
  status: string
}): boolean {
  if (isSessionExpired(room.created_at)) return true
  const inactivityTtl = STATUS_INACTIVITY_TTL_MS[room.status] ?? STATUS_INACTIVITY_TTL_MS['lobby']
  const lastActivityMs = toTimestampMs(room.last_activity_at)
  if (!lastActivityMs) return false
  return Date.now() - lastActivityMs > inactivityTtl
}
