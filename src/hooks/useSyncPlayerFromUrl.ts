'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useGameStore } from '@/store/gameStore'
import { AVATAR_COLORS } from '@/types'

/** If URL carries ?pid=&pname=&pcolor= but Zustand is still empty (rehydrate delay), restore session. */
export function useSyncPlayerFromUrl() {
  const searchParams = useSearchParams()
  const playerId = useGameStore(s => s.playerId)
  const setPlayer = useGameStore(s => s.setPlayer)

  useEffect(() => {
    const pid = searchParams.get('pid')
    if (!pid) return
    if (playerId) return
    const pname = searchParams.get('pname')
    if (!pname?.trim()) return
    const pcolor = searchParams.get('pcolor') ?? AVATAR_COLORS[0]
    setPlayer(pid, pname.trim(), pcolor)
  }, [searchParams, playerId, setPlayer])
}
