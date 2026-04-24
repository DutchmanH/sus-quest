'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { SidequestCard } from '@/components/game/SidequestCard'
import { useRoom } from '@/hooks/useRoom'
import { useGameStore } from '@/store/gameStore'
import { createClient } from '@/lib/supabase/client'

interface CardPageProps {
  params: Promise<{ code: string }>
}

export default function CardPage({ params }: CardPageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { playerId, language } = useGameStore()
  const { room, players, currentRound, loading } = useRoom(code)
  const [cardData, setCardData] = useState<{ isSus: boolean; text: string } | null>(null)
  const [cardLoading, setCardLoading] = useState(true)

  useEffect(() => {
    if (!currentRound || !playerId) return

    async function loadCard() {
      const supabase = createClient()
      const isSus = currentRound!.sidequest_player_id === playerId

      let text: string
      if (isSus) {
        // Fetch the sidequest from server (should be done via a secure API route in production)
        const { data } = await supabase
          .from('rounds')
          .select('sidequest_nl, sidequest_en')
          .eq('id', currentRound!.id)
          .single()

        text = language === 'en'
          ? (data?.sidequest_en ?? 'Doe niets opvallends.')
          : (data?.sidequest_nl ?? 'Doe niets opvallends.')
      } else {
        text = language === 'en'
          ? currentRound!.fake_task_en
          : currentRound!.fake_task_nl
      }

      setCardData({ isSus, text })
      setCardLoading(false)
    }

    loadCard()
  }, [currentRound?.id, playerId, language])

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
          text={cardData.text}
          missionLabel="MISSIE"
          onClose={() => router.back()}
          closeLabel="sluit kaart"
          succeededLabel="GELUKT"
          caughtLabel="BETRAPT"
          readFastLabel="lees ff snel, en act normal. ze loeren."
          missionNumber={room.current_round}
        />
      </div>
    </MobileContainer>
  )
}
