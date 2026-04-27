'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { SidequestCard } from '@/components/game/SidequestCard'
import { useRoom } from '@/hooks/useRoom'
import { useGameStore } from '@/store/gameStore'

interface CardPageProps {
  params: Promise<{ code: string }>
}

export default function CardPage({ params }: CardPageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { playerId, language } = useGameStore()
  const { room, currentRound, loading } = useRoom(code)
  const [cardData, setCardData] = useState<{ isSus: boolean; hasSidequest: boolean; text: string } | null>(null)
  const [cardLoading, setCardLoading] = useState(true)

  useEffect(() => {
    if (room?.status === 'lobby') {
      router.push(`/lobby/${code}`)
    }
  }, [room?.status, code, router])

  useEffect(() => {
    if (!currentRound || !playerId) return

    const round = currentRound

    async function loadCard() {
      const isSus = round.sidequest_player_id === playerId
      const hasSidequest = round.has_sidequest
      const sidequestText = language === 'en'
        ? (round.sidequest_en ?? 'Keep it subtle. No one should notice.')
        : (round.sidequest_nl ?? 'Houd het subtiel. Niemand mag het merken.')
      const fakeTaskText = language === 'en'
        ? (round.fake_task_en || 'Stay sharp and trust no one.')
        : (round.fake_task_nl || 'Blijf scherp en vertrouw niemand.')
      const noSidequestText = language === 'en'
        ? 'No sidequest this round. Keep a poker face anyway.'
        : 'Geen sidequest deze ronde. Houd alsnog je pokerface.'

      const text = isSus
        ? sidequestText
        : hasSidequest
          ? fakeTaskText
          : noSidequestText

      setCardData({ isSus, hasSidequest, text })
      setCardLoading(false)
    }

    loadCard()
  }, [currentRound, playerId, language])

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
