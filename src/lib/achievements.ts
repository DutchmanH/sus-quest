interface Stats {
  games_played: number
  times_sus: number
  sus_successes: number
  correct_accusations: number
  total_score: number
}

export interface Achievement {
  id: string
  emoji: string
  title: string
  description: string
  unlocked: (s: Stats) => boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  // Games played
  {
    id: 'first_game',
    emoji: '🎮',
    title: 'Eerste potje',
    description: 'Speel je allereerste game.',
    unlocked: s => s.games_played >= 1,
  },
  {
    id: 'regular',
    emoji: '🔄',
    title: 'Stamgast',
    description: 'Speel 5 games. Je bent officieel verslaafd.',
    unlocked: s => s.games_played >= 5,
  },
  {
    id: 'veteran',
    emoji: '🏆',
    title: 'Veteraan',
    description: '10 games gespeeld. Niemand vertrouwt je meer.',
    unlocked: s => s.games_played >= 10,
  },
  {
    id: 'party_animal',
    emoji: '🎪',
    title: 'Party animal',
    description: '25 games. Serieus, ga een keer slapen.',
    unlocked: s => s.games_played >= 25,
  },

  // Sus
  {
    id: 'first_sus',
    emoji: '🕵️',
    title: 'Eerste suspect',
    description: 'Voor het eerst de sus — hoe voelt dat?',
    unlocked: s => s.times_sus >= 1,
  },
  {
    id: 'sus_royalty',
    emoji: '👑',
    title: 'Sus royalty',
    description: '5x de sus geweest. Je hebt een talent voor liegen.',
    unlocked: s => s.times_sus >= 5,
  },
  {
    id: 'chronically_sus',
    emoji: '🎭',
    title: 'Chronisch verdacht',
    description: '10x de sus. Op dit punt is iedereen al bang voor je.',
    unlocked: s => s.times_sus >= 10,
  },

  // Sus successes
  {
    id: 'first_success',
    emoji: '😇',
    title: 'Onschuldig gezicht',
    description: 'Je eerste sidequest ongemerkt voltooid. Engerd.',
    unlocked: s => s.sus_successes >= 1,
  },
  {
    id: 'ninja',
    emoji: '🥷',
    title: 'Ninja',
    description: '5 sidequests voltooid zonder gepakt te worden.',
    unlocked: s => s.sus_successes >= 5,
  },
  {
    id: 'masterspy',
    emoji: '🤫',
    title: 'Meesterspy',
    description: '10 sidequests ongemerkt. Je liegt beter dan je denkt.',
    unlocked: s => s.sus_successes >= 10,
  },

  // Accusations
  {
    id: 'first_accusation',
    emoji: '🔍',
    title: 'Sherlock',
    description: 'Je eerste correcte beschuldiging. Lucky guess of talent?',
    unlocked: s => s.correct_accusations >= 1,
  },
  {
    id: 'people_reader',
    emoji: '🧐',
    title: 'Menskenner',
    description: '5x raak beschuldigd. Je leest mensen als een boek.',
    unlocked: s => s.correct_accusations >= 5,
  },
  {
    id: 'infallible',
    emoji: '🎯',
    title: 'Onfeilbaar',
    description: '10 correcte beschuldigingen. Onmogelijk. Verdacht.',
    unlocked: s => s.correct_accusations >= 10,
  },

  // Score
  {
    id: 'score_hero',
    emoji: '⭐',
    title: 'Scoreheld',
    description: 'Bereik een totaalscore van 10 punten.',
    unlocked: s => s.total_score >= 10,
  },
  {
    id: 'high_scorer',
    emoji: '💫',
    title: 'Hoog scorend',
    description: '25 punten totaal. Jij neemt dit serieus.',
    unlocked: s => s.total_score >= 25,
  },

  // Combo / special
  {
    id: 'perfect_sus',
    emoji: '💯',
    title: 'Perfecte sus',
    description: 'Minstens 3x de sus geweest en nooit gepakt.',
    unlocked: s => s.times_sus >= 3 && s.sus_successes === s.times_sus,
  },
  {
    id: 'double_threat',
    emoji: '⚡',
    title: 'Dubbel gevaar',
    description: 'Zowel 3 correcte beschuldigingen als 3 voltooide sidequests.',
    unlocked: s => s.correct_accusations >= 3 && s.sus_successes >= 3,
  },
]

export function getUnlockedAchievements(stats: Stats) {
  return ACHIEVEMENTS.map(a => ({ ...a, isUnlocked: a.unlocked(stats) }))
}
