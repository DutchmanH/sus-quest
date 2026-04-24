import type { RoomPlayer, Accusation } from '@/types'

export function calculateScores(
  players: RoomPlayer[],
  accusations: Accusation[],
  sidequestPlayerId: string | null,
  sidequestSucceeded: boolean
): Record<string, number> {
  const deltas: Record<string, number> = {}

  // Sidequest scoring
  if (sidequestPlayerId && sidequestSucceeded) {
    deltas[sidequestPlayerId] = (deltas[sidequestPlayerId] ?? 0) + 1
  }

  // Accusation scoring
  for (const acc of accusations) {
    if (acc.is_correct === true) {
      deltas[acc.accuser_player_id] = (deltas[acc.accuser_player_id] ?? 0) + 1
    } else if (acc.is_correct === false) {
      deltas[acc.accuser_player_id] = (deltas[acc.accuser_player_id] ?? 0) - 1
    }
  }

  return deltas
}

export function getPlayerTitle(score: number, rank: number): string {
  if (rank === 1) return 'Master of Deception'
  if (score <= -1) return 'Least Trustworthy Human'
  if (rank === 2) return 'Amateur Detective'
  if (rank === 3) return 'Doet Zijn Best'
  if (score <= 2) return 'Verdacht Stil'
  return 'Gewoon Sus'
}

export function resolveAccusations(
  accusations: Accusation[],
  sidequestPlayerId: string | null
): Accusation[] {
  return accusations.map(acc => ({
    ...acc,
    is_correct: acc.accused_player_id === sidequestPlayerId,
  }))
}
