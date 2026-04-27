'use client'

import { useEffect, useRef, useState } from 'react'
import { isRoomExpired } from '@/lib/game-expiry'
import { createClient } from '@/lib/supabase/client'
import type { Room, RoomPlayer, Round } from '@/types'

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)

  const [supabase] = useState(() => createClient())
  const roomIdRef = useRef<string | undefined>(undefined)
  const currentRoundNumberRef = useRef<number | undefined>(undefined)

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
        currentRoundNumberRef.current = roomData.current_round
        setRoom(roomData as Room)
        setExpired(isRoomExpired(roomData as Room))

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
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInitialData()

    const channel = supabase
      .channel(`room-${code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${code.toUpperCase()}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const nextRoom = payload.new as Room
            currentRoundNumberRef.current = nextRoom.current_round
            setRoom(nextRoom)
            setExpired(isRoomExpired(nextRoom))
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
        { event: '*', schema: 'public', table: 'rounds' },
        (payload) => {
          const changedRound = (payload.new ?? payload.old) as Round
          if (!changedRound) return
          if (roomIdRef.current && changedRound.room_id !== roomIdRef.current) return
          setCurrentRound((prev) => {
            const currentRoundNumber = currentRoundNumberRef.current
            if (prev?.id === changedRound.id) return changedRound
            if (changedRound.status === 'active') return changedRound
            if (currentRoundNumber && changedRound.round_number === currentRoundNumber) return changedRound
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

  // Periodic expiry check — room.last_activity_at updates via realtime when triggers fire
  useEffect(() => {
    if (!room) return
    const timer = setInterval(() => {
      setExpired(isRoomExpired(room))
    }, 30_000)
    return () => clearInterval(timer)
  }, [room])

  useEffect(() => {
    if (!roomIdRef.current) return
    if (!(room?.status === 'playing' || room?.status === 'finished')) return

    let cancelled = false
    async function refreshCurrentRound() {
      const { data } = await supabase
        .from('rounds')
        .select('*')
        .eq('room_id', roomIdRef.current)
        .eq('round_number', room!.current_round)
        .maybeSingle()
      if (!cancelled && data) {
        setCurrentRound(data as Round)
      }
    }

    refreshCurrentRound()

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, room?.status, room?.current_round, supabase])

  return { room, players, currentRound, loading, expired }
}
