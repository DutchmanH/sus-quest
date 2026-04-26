'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Room, RoomPlayer, Round } from '@/types'

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [loading, setLoading] = useState(true)

  // Single client instance for the lifetime of this hook
  const supabase = useRef(createClient()).current

  useEffect(() => {
    if (!code) return

    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', code.toUpperCase())
          .single()

        if (cancelled || roomError || !roomData) return

        const roomId = roomData.id
        setRoom(roomData as Room)

        // Fetch players and current round in parallel
        const needsRound = roomData.status === 'playing' || roomData.status === 'finished'
        const [{ data: playersData }, { data: roundData }] = await Promise.all([
          supabase
            .from('room_players')
            .select('*')
            .eq('room_id', roomId)
            .order('joined_at', { ascending: true }),
          needsRound
            ? supabase
                .from('rounds')
                .select('*')
                .eq('room_id', roomId)
                .eq('round_number', roomData.current_round)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ])

        if (cancelled) return

        setPlayers((playersData ?? []) as RoomPlayer[])
        if (roundData) setCurrentRound(roundData as Round)

        // Set up realtime subscriptions now that we have roomId
        channel = supabase
          .channel(`room-${code}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${code.toUpperCase()}` },
            (payload) => {
              if (payload.eventType === 'UPDATE') setRoom(payload.new as Room)
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
            async () => {
              const { data } = await supabase
                .from('room_players')
                .select('*')
                .eq('room_id', roomId)
                .order('joined_at', { ascending: true })
              if (!cancelled) setPlayers((data ?? []) as RoomPlayer[])
            }
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `room_id=eq.${roomId}` },
            (payload) => {
              const updated = payload.new as Round
              setCurrentRound((prev) => {
                if (prev?.id === updated.id || updated.status === 'active') return updated
                return prev
              })
            }
          )
          .subscribe()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return { room, players, currentRound, loading }
}
