'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GameStore {
  playerId: string | null
  playerName: string | null
  playerColor: string | null
  language: 'nl' | 'en'

  setPlayer: (id: string, name: string, color: string) => void
  setLanguage: (lang: 'nl' | 'en') => void
  reset: () => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      playerId: null,
      playerName: null,
      playerColor: null,
      language: 'nl',

      setPlayer: (id, name, color) =>
        set({ playerId: id, playerName: name, playerColor: color }),
      setLanguage: (language) => set({ language }),
      reset: () => set({ playerId: null, playerName: null, playerColor: null }),
    }),
    {
      name: 'susquest-store',
    }
  )
)
