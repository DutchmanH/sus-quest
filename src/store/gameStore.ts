'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Room, RoomPlayer, Round } from '@/types'

interface GameStore {
  // Current player info (persisted across navigations)
  playerId: string | null
  playerName: string | null
  playerColor: string | null

  // Current room state (from realtime)
  room: Room | null
  players: RoomPlayer[]
  currentRound: Round | null
  myCard: { isSus: boolean; text: string } | null

  // Language preference
  language: 'nl' | 'en'

  // Actions
  setPlayer: (id: string, name: string, color: string) => void
  setRoom: (room: Room | null) => void
  setPlayers: (players: RoomPlayer[]) => void
  setCurrentRound: (round: Round | null) => void
  setMyCard: (card: { isSus: boolean; text: string } | null) => void
  setLanguage: (lang: 'nl' | 'en') => void
  reset: () => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      playerId: null,
      playerName: null,
      playerColor: null,
      room: null,
      players: [],
      currentRound: null,
      myCard: null,
      language: 'nl',

      setPlayer: (id, name, color) =>
        set({ playerId: id, playerName: name, playerColor: color }),
      setRoom: (room) => set({ room }),
      setPlayers: (players) => set({ players }),
      setCurrentRound: (round) => set({ currentRound: round }),
      setMyCard: (card) => set({ myCard: card }),
      setLanguage: (language) => set({ language }),
      reset: () => set({
        room: null,
        players: [],
        currentRound: null,
        myCard: null,
      }),
    }),
    {
      name: 'susquest-store',
      partialize: (state) => ({
        playerId: state.playerId,
        playerName: state.playerName,
        playerColor: state.playerColor,
        language: state.language,
      }),
    }
  )
)
