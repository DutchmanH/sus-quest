import { Avatar } from '@/components/ui/Avatar'
import type { RoomPlayer } from '@/types'

interface PlayerRowProps {
  player: RoomPlayer
  isMe?: boolean
  icon?: string
  highlightMeRing?: boolean
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
  showScore?: boolean
  rank?: number
  showHostTag?: boolean
}

export function PlayerRow({ player, isMe, icon, highlightMeRing = true, selectable, selected, onSelect, showScore, rank, showHostTag = true }: PlayerRowProps) {
  return (
    <button
      onClick={onSelect}
      disabled={!selectable}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-2xl
        transition-all duration-150
        ${selectable ? 'cursor-pointer' : 'cursor-default'}
        ${selected
          ? 'bg-[var(--coral)] text-white'
          : isMe
            ? `bg-[var(--bg-card)] ${highlightMeRing ? 'ring-1 ring-[var(--mint)] ring-offset-1 ring-offset-[var(--bg-primary)]' : ''}`
            : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]'
        }
      `}
    >
      {rank && (
        <span className="w-6 text-sm font-mono text-[var(--text-muted)]">{rank}</span>
      )}
      <Avatar
        name={player.display_name}
        color={selected ? '#fff' : player.avatar_color}
        icon={icon}
        size="md"
      />
      <span className="flex-1 text-left font-semibold text-[var(--text-primary)]">
        {player.display_name}
        {isMe && (
          <span className="ml-2 text-[10px] font-mono tracking-widest text-[var(--mint)] opacity-80">JIJ</span>
        )}
      </span>
      {showHostTag && player.is_host && (
        <span className="text-xs font-mono tracking-widest border border-[var(--mint)] text-[var(--mint)] px-2 py-0.5 rounded-full">
          HOST
        </span>
      )}
      {selected && (
        <span className="text-xs font-mono tracking-widest text-white">✓ GEKOZEN</span>
      )}
      {showScore && (
        <span className={`text-lg font-bold ${player.score < 0 ? 'text-[var(--coral)]' : 'text-[var(--mint)]'}`}>
          {player.score}
        </span>
      )}
      {!showScore && !selected && (isMe || !selectable) && (
        <span className={`text-xs font-mono tracking-widest px-2 py-0.5 rounded-full border ${
          player.is_ready
            ? 'border-[var(--mint)] text-[var(--mint)]'
            : 'border-[var(--gold)] text-[var(--gold)]'
        }`}>
          {player.is_ready ? '✓ READY' : '… WACHT'}
        </span>
      )}
    </button>
  )
}
