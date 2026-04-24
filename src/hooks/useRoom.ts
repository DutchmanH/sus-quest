'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Room, RoomPlayer, Round } from '@/types'

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    if (!code) return

    let roomId: string

    async function loadInitialData() {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code.toUpperCase())
        .single()

      if (!roomData) { setLoading(false); return }

      roomId = roomData.id
      setRoom(roomData as Room)

      const { data: playersData } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true })

      setPlayers((playersData ?? []) as RoomPlayer[])

      if (roomData.status === 'playing' || roomData.status === 'finished') {
        const { data: roundData } = await supabase
          .from('rounds')
          .select('*')
          .eq('room_id', roomId)
          .eq('round_number', roomData.current_round)
          .single()

        if (roundData) setCurrentRound(roundData as Round)
      }

      setLoading(false)
    }

    loadInitialData()

    const channel = supabase
      .channel(`room-${code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${code.toUpperCase()}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setRoom(payload.new as Room)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players' },
        async () => {
          if (!roomId) return
          const { data } = await supabase
            .from('room_players')
            .select('*')
            .eq('room_id', roomId)
            .order('joined_at', { ascending: true })
          setPlayers((data ?? []) as RoomPlayer[])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rounds' },
        (payload) => {
          const updated = payload.new as Round
          setCurrentRound((prev) => {
            if (prev?.id === updated.id || updated.status === 'active') {
              return updated
            }
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [code])

  return { room, players, currentRound, loading }
}
