import { Avatar } from '@/components/ui/Avatar'
import type { RoomPlayer } from '@/types'

interface PlayerStripProps {
  players: RoomPlayer[]
  activePlayerId?: string
}

export function PlayerStrip({ players, activePlayerId }: PlayerStripProps) {
  return (
    <div className="flex items-end justify-center gap-3 py-2">
      {players.map((player) => (
        <div key={player.id} className="flex flex-col items-center gap-1">
          <Avatar
            name={player.display_name}
            color={player.avatar_color}
            size="lg"
            active={player.id === activePlayerId}
          />
          <span className="text-xs text-[var(--text-muted)] font-mono truncate max-w-[48px] text-center">
            {player.display_name.split(' ')[0]}
          </span>
        </div>
      ))}
    </div>
  )
}
