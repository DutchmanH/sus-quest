export type GameMode = 'multiplayer' | 'single_device'
export type RoomStatus = 'lobby' | 'settings' | 'generating' | 'playing' | 'finished'
export type RoundStatus = 'pending' | 'active' | 'accuse' | 'reveal' | 'done'
export type Vibe = 'chill' | 'chaos' | 'awkward' | 'spicy' | 'comp'
export type ContentLevel = 'safe' | 'spicy' | 'extra_spicy'

// New settings system (replaces vibe + content_level in UI)
export type Setting = 'bank' | 'feest' | 'after_midnight' | 'onderweg'
export type Groep = 'vrienden' | 'vreemden' | 'stelletjes' | 'familie'
export type Boldness = 'gezellig' | 'blozen' | 'niemand_veilig'

export interface Profile {
  id: string
  username: string
  avatar_color: string
  is_admin: boolean
  games_played: number
  created_at: string
}

export interface Room {
  id: string
  code: string
  host_id: string
  mode: GameMode
  status: RoomStatus
  rounds_total: number
  current_round: number
  vibe: string
  content_level: string
  groep: string
  language: string
  created_at: string
}

export interface RoomPlayer {
  id: string
  room_id: string
  user_id: string | null
  display_name: string
  avatar_color: string
  is_ready: boolean
  is_host: boolean
  score: number
  joined_at: string
}

export interface Round {
  id: string
  room_id: string
  round_number: number
  main_question_nl: string
  main_question_en: string
  has_sidequest: boolean
  sidequest_player_id: string | null
  sidequest_nl: string | null
  sidequest_en: string | null
  fake_task_nl: string
  fake_task_en: string
  status: RoundStatus
  created_at: string
}

export interface Accusation {
  id: string
  room_id: string
  round_id: string
  accuser_player_id: string
  accused_player_id: string
  is_correct: boolean | null
  created_at: string
}

export interface GeneratedRound {
  mainQuestion: { nl: string; en: string }
  hasSidequest: boolean
  sidequest?: {
    playerIndex: number
    text: { nl: string; en: string }
  }
  fakeTask: { nl: string; en: string }
}

export const AVATAR_COLORS = [
  '#5DEDD4', // mint
  '#FF7F6B', // coral
  '#F5C842', // gold
  '#A78BFA', // purple
  '#60A5FA', // blue
  '#F472B6', // pink
  '#34D399', // green
  '#FB923C', // orange
]
