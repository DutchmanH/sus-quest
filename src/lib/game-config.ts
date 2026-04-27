const MINUTE_MS = 60 * 1000

function readPositiveIntEnv(key: string, fallback: number): number {
  const raw = process.env[key]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export const SESSION_TTL_MINUTES = readPositiveIntEnv('SESSION_TTL_MINUTES', 180)
export const PLAYER_ACTIVE_WINDOW_MINUTES = readPositiveIntEnv('PLAYER_ACTIVE_WINDOW_MINUTES', 20)
export const GAME_INACTIVITY_TTL_MINUTES = readPositiveIntEnv('GAME_INACTIVITY_TTL_MINUTES', 45)

export const SESSION_TTL_MS = SESSION_TTL_MINUTES * MINUTE_MS
export const PLAYER_ACTIVE_WINDOW_MS = PLAYER_ACTIVE_WINDOW_MINUTES * MINUTE_MS
export const GAME_INACTIVITY_TTL_MS = GAME_INACTIVITY_TTL_MINUTES * MINUTE_MS
