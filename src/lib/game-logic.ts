import type { RoomPlayer, Accusation } from '@/types'

export function calculateScores(
  players: RoomPlayer[],
  accusations: Accusation[],
  sidequestPlayerId: string | null,
): Record<string, number> {
  const deltas: Record<string, number> = {}

  // Accusation scoring: +1 correct, +0 wrong (no negatives)
  for (const acc of accusations) {
    if (acc.is_correct === true) {
      deltas[acc.accuser_player_id] = (deltas[acc.accuser_player_id] ?? 0) + 1
    }
  }

  // Sus player scoring based on majority detection
  if (sidequestPlayerId) {
    const totalVoters = players.filter(p => p.id !== sidequestPlayerId).length
    const votesForSus = accusations.filter(a => a.accused_player_id === sidequestPlayerId).length
    const caughtByMajority = totalVoters > 0 && votesForSus > totalVoters / 2

    if (caughtByMajority) {
      deltas[sidequestPlayerId] = (deltas[sidequestPlayerId] ?? 0) + 0
    } else if (votesForSus === 0) {
      deltas[sidequestPlayerId] = (deltas[sidequestPlayerId] ?? 0) + 3
    } else {
      deltas[sidequestPlayerId] = (deltas[sidequestPlayerId] ?? 0) + 2
    }
  }

  return deltas
}

export function getPlayerTitle(score: number, rank: number): string {
  if (rank === 1) return 'Master of Deception'
  if (rank === 2) return 'Amateur Detective'
  if (rank === 3) return 'Doet Zijn Best'
  if (score === 0) return 'Verdacht Onschuldig'
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
