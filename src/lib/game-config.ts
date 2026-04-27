const MINUTE_MS = 60 * 1000

function readPositiveIntEnv(key: string, fallback: number): number {
  const raw = process.env[key]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export const SESSION_TTL_MINUTES = readPositiveIntEnv('SESSION_TTL_MINUTES', 1440)
export const PLAYER_ACTIVE_WINDOW_MINUTES = readPositiveIntEnv('PLAYER_ACTIVE_WINDOW_MINUTES', 20)

export const SESSION_TTL_MS = SESSION_TTL_MINUTES * MINUTE_MS
export const PLAYER_ACTIVE_WINDOW_MS = PLAYER_ACTIVE_WINDOW_MINUTES * MINUTE_MS

// Inactivity TTL per room status (minutes)
export const STATUS_INACTIVITY_TTL_MINUTES: Record<string, number> = {
  lobby:      45,
  generating: 15,
  playing:    90,
  finished:   30,
}

export const STATUS_INACTIVITY_TTL_MS: Record<string, number> = Object.fromEntries(
  Object.entries(STATUS_INACTIVITY_TTL_MINUTES).map(([k, v]) => [k, v * MINUTE_MS])
)
