'use client'

import { useEffect, useRef, useState } from 'react'
import { getLatestActivityTimestamp, isGameExpired, isSessionExpired } from '@/lib/game-expiry'
import { createClient } from '@/lib/supabase/client'
import type { Room, RoomPlayer, Round } from '@/types'

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)

  const supabase = useRef(createClient()).current
  // roomId becomes available after initial fetch; realtime handlers read it via ref
  const roomIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!code) return

    let cancelled = false

    async function loadInitialData() {
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', code.toUpperCase())
          .single()

        if (cancelled || roomError || !roomData) return

        roomIdRef.current = roomData.id
        setRoom(roomData as Room)

        const needsRound = roomData.status === 'playing' || roomData.status === 'finished'
        const [{ data: playersData }, { data: roundData }] = await Promise.all([
          supabase
            .from('room_players')
            .select('*')
            .eq('room_id', roomData.id)
            .order('joined_at', { ascending: true }),
          needsRound
            ? supabase
                .from('rounds')
                .select('*')
                .eq('room_id', roomData.id)
                .eq('round_number', roomData.current_round)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ])

        if (cancelled) return
        setPlayers((playersData ?? []) as RoomPlayer[])
        if (roundData) setCurrentRound(roundData as Round)
        const latestActivityAt = getLatestActivityTimestamp(
          roomData.created_at,
          (playersData ?? []).at(-1)?.joined_at,
          roundData?.created_at
        )
        setExpired(isSessionExpired(roomData.created_at) || isGameExpired(latestActivityAt))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInitialData()

    // Subscribe immediately so no events are missed while initial data loads.
    // roomIdRef.current is checked at event-handler time, not subscription-setup time,
    // so we don't need a server-side filter (which requires REPLICA IDENTITY FULL).
    const channel = supabase
      .channel(`room-${code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${code.toUpperCase()}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const nextRoom = payload.new as Room
            setRoom(nextRoom)
            if (nextRoom.status === 'finished' && nextRoom.current_round <= 1) {
              setExpired(true)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players' },
        async () => {
          const roomId = roomIdRef.current
          if (!roomId) return
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
        { event: 'UPDATE', schema: 'public', table: 'rounds' },
        (payload) => {
          const updated = payload.new as Round
          if (roomIdRef.current && updated.room_id !== roomIdRef.current) return
          setCurrentRound((prev) => {
            if (prev?.id === updated.id || updated.status === 'active') return updated
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  useEffect(() => {
    if (!room) return
    const evaluate = () => {
      const latestPlayer = [...players].sort((a, b) => Date.parse(b.joined_at) - Date.parse(a.joined_at))[0]
      const latestActivityAt = getLatestActivityTimestamp(room.created_at, latestPlayer?.joined_at, currentRound?.created_at)
      setExpired(isSessionExpired(room.created_at) || isGameExpired(latestActivityAt))
    }
    evaluate()
    const timer = setInterval(evaluate, 30_000)
    return () => clearInterval(timer)
  }, [room, players, currentRound])

  return { room, players, currentRound, loading, expired }
}
