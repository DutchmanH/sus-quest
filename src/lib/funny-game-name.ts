const PREFIXES_EN = [
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

const THEMES_EN = [
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

const GROUPS_EN = [
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

const CHAOS_TAGS_EN = [
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

const PREFIXES_NL = [
  'Verdachte',
  'Chaotische',
  'Sluwe',
  'Paranoïde',
  'Nachtelijke',
  'Pikante',
  'Ondergrondse',
  'Onbetrouwbare',
]

const THEMES_NL = [
  'Alibi',
  'Vertrouwen',
  'Mysterie',
  'Chaos',
  'Leugen',
  'Sidequest',
  'Achterdocht',
  'Onderzoek',
  'Afterparty',
  'Complot',
  'Ondervraging',
]

const GROUPS_NL = [
  'Club',
  'Ploeg',
  'Comité',
  'Collectief',
  'Bende',
  'Raad',
  'Genootschap',
  'Kliek',
]

const CHAOS_TAGS_NL = [
  'Editie',
  'Protocol',
  'Incident',
  'Operatie',
  'Dossier',
  'Experiment',
  'Nachtshift',
  'Spoedronde',
]

export function generateFunnyGameName(locale: 'en' | 'nl' | 'mixed' = 'mixed'): string {
  const useNl = locale === 'nl' || (locale === 'mixed' && Math.random() < 0.5)
  const PREFIXES = useNl ? PREFIXES_NL : PREFIXES_EN
  const THEMES = useNl ? THEMES_NL : THEMES_EN
  const GROUPS = useNl ? GROUPS_NL : GROUPS_EN
  const CHAOS_TAGS = useNl ? CHAOS_TAGS_NL : CHAOS_TAGS_EN

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
