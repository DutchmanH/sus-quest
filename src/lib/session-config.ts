const DEFAULT_SESSION_EXPIRY_MINUTES = 180
const DEFAULT_LIVE_ACTIVITY_WINDOW_MINUTES = 20
const DEFAULT_GAME_EXPIRY_MINUTES = 180

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export function getSessionExpiryMinutes(): number {
  return readPositiveInt(process.env.SESSION_EXPIRY_MINUTES, DEFAULT_SESSION_EXPIRY_MINUTES)
}

export function getLiveActivityWindowMinutes(): number {
  return readPositiveInt(
    process.env.LIVE_ACTIVITY_WINDOW_MINUTES,
    DEFAULT_LIVE_ACTIVITY_WINDOW_MINUTES
  )
}

export function getGameExpiryMinutes(): number {
  return readPositiveInt(process.env.GAME_EXPIRY_MINUTES, DEFAULT_GAME_EXPIRY_MINUTES)
}

export function getPublicGameExpiryMinutes(): number {
  return readPositiveInt(process.env.NEXT_PUBLIC_GAME_EXPIRY_MINUTES, DEFAULT_GAME_EXPIRY_MINUTES)
}

export function minutesAgoIso(minutes: number): string {
  const now = Date.now()
  return new Date(now - minutes * 60_000).toISOString()
}

export function isExpiredByMinutes(isoDate: string, ttlMinutes: number): boolean {
  const createdAt = new Date(isoDate).getTime()
  if (!Number.isFinite(createdAt)) return false
  const ageMs = Date.now() - createdAt
  return ageMs > ttlMinutes * 60_000
}
