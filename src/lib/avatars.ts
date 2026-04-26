export const AVATAR_ICONS = [
  '🕵️', '🦝', '🧃', '🛸', '🐸', '🫥',
  '😈', '🤖', '👻', '🐙', '🦊', '🐼',
] as const

export type AvatarIcon = typeof AVATAR_ICONS[number]

export const DEFAULT_ICON = '🕵️'
