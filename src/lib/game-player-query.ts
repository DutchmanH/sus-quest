import type { ReadonlyURLSearchParams } from 'next/navigation'

export interface PlayerSessionFields {
  playerId: string | null
  playerName: string | null
  playerColor: string | null
}

/**
 * Query suffix (?pid=&pname=&pcolor=) so guests keep identity across client-side navigations
 * when Zustand rehydration lags or a new tab opens the game URL with params from the host QR flow.
 */
export function playerSessionSuffix(
  searchParams: ReadonlyURLSearchParams | null,
  store: PlayerSessionFields,
): string {
  const pid = store.playerId ?? searchParams?.get('pid') ?? null
  if (!pid) return ''
  const pname = store.playerName ?? searchParams?.get('pname') ?? ''
  const pcolor = store.playerColor ?? searchParams?.get('pcolor') ?? ''
  const qs = new URLSearchParams()
  qs.set('pid', pid)
  if (pname) qs.set('pname', pname)
  if (pcolor) qs.set('pcolor', pcolor)
  return `?${qs.toString()}`
}

export function normalizeRoomCodeParam(code: string): string {
  return code.trim().toUpperCase()
}
