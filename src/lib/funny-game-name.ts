const PREFIXES = [
  'Sussy',
  'Chaotic',
  'Sneaky',
  'Drama',
  'Zero-Trust',
  'Guilty',
  'Midnight',
  'Unhinged',
  'Paranoid',
  'No-Comment',
  'Highly Suspicious',
  'Questionable',
]

const THEMES = [
  'Alibi',
  'Trust',
  'Mystery',
  'Chaos',
  'Lie',
  'Sidequest',
  'Suspicion',
  'Poker Face',
  'Conspiracy',
  'Drama',
  'Interrogation',
  'Afterparty',
]

const GROUPS = [
  'Club',
  'Crew',
  'Society',
  'League',
  'Department',
  'Committee',
  'Collective',
  'Syndicate',
  'Gang',
  'Squad',
  'Council',
]

const CHAOS_TAGS = [
  'Edition',
  'Protocol',
  'Incident',
  'Saga',
  'Operation',
  'Arc',
  'Files',
  'Experiment',
]

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)]
}

export function generateFunnyGameName(): string {
  const pattern = Math.floor(Math.random() * 4)
  const number = Math.floor(Math.random() * 89) + 11

  if (pattern === 0) {
    return `${pick(PREFIXES)} ${pick(THEMES)} ${pick(GROUPS)}`
  }

  if (pattern === 1) {
    return `${pick(THEMES)} ${pick(GROUPS)}: ${pick(CHAOS_TAGS)} ${number}`
  }

  if (pattern === 2) {
    return `${pick(PREFIXES)} ${pick(CHAOS_TAGS)}`
  }

  return `${pick(THEMES)} & ${pick(THEMES)} ${pick(GROUPS)}`
}
