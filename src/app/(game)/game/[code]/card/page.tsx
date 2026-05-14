'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { SidequestCard } from '@/components/game/SidequestCard'
import { useRoom } from '@/hooks/useRoom'
import { useSyncPlayerFromUrl } from '@/hooks/useSyncPlayerFromUrl'
import { useGameStore } from '@/store/gameStore'
import { normalizeRoomCodeParam, playerSessionSuffix } from '@/lib/game-player-query'

interface CardPageProps {
  params: Promise<{ code: string }>
}

export default function CardPage({ params }: CardPageProps) {
  const { code } = use(params)
  const roomCode = normalizeRoomCodeParam(code)
  const router = useRouter()
  const searchParams = useSearchParams()
  useSyncPlayerFromUrl()
  const { playerId, playerName, playerColor, language } = useGameStore()
  const sessionSuffix = useMemo(
    () => playerSessionSuffix(searchParams, { playerId, playerName, playerColor }),
    [searchParams, playerId, playerName, playerColor],
  )
  const effectivePlayerId = playerId ?? searchParams.get('pid') ?? ''
  const { room, currentRound, loading } = useRoom(roomCode)
  const [cardData, setCardData] = useState<{ isSus: boolean; hasSidequest: boolean; text: string } | null>(null)
  const [cardLoading, setCardLoading] = useState(true)

  useEffect(() => {
    if (room?.status === 'lobby') {
      router.push(`/lobby/${roomCode}${sessionSuffix}`)
    }
  }, [room?.status, roomCode, router, sessionSuffix])

  useEffect(() => {
    if (!currentRound || !effectivePlayerId) return

    const round = currentRound

    async function loadCard() {
      const isSus = round.sidequest_player_id === effectivePlayerId
      const hasSidequest = round.has_sidequest
      const sidequestText = language === 'en'
        ? (round.sidequest_en ?? 'Keep it subtle. No one should notice.')
        : (round.sidequest_nl ?? 'Houd het subtiel. Niemand mag het merken.')
      const fakeTaskText = language === 'en'
        ? (round.suspicious_fact_en || 'Stay sharp and trust no one.')
        : (round.suspicious_fact_nl || 'Blijf scherp en vertrouw niemand.')

      const text = isSus
        ? sidequestText
        : fakeTaskText

      setCardData({ isSus, hasSidequest, text })
      setCardLoading(false)
    }

    loadCard()
  }, [currentRound, effectivePlayerId, language])

  if (loading || cardLoading || !cardData || !currentRound || !room) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--mint)] border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileContainer>
    )
  }

  return (
    <MobileContainer>
      <div className="flex-1 flex items-end" style={{ background: 'rgba(0,0,0,0.85)' }}>
        <SidequestCard
          isSus={cardData.isSus}
          hasSidequest={cardData.hasSidequest}
          text={cardData.text}
          onClose={() => router.back()}
          missionNumber={room.current_round}
        />
      </div>
    </MobileContainer>
  )
}
