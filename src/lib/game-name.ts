const ADJECTIVES = [
  'Verdachte',
  'Spicy',
  'Chaotische',
  'Glitchy',
  'Sluwe',
  'Wazige',
  'Onhandige',
  'Hyper',
]

const NOUNS = [
  'Kamerraad',
  'Complot',
  'Tafelbende',
  'Onderonsje',
  'Maskerade',
  'Susclub',
  'Chaosraad',
  'Verhoor',
]

function hashCode(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

export function generateFunnyGameName(roomCode: string): string {
  const normalized = roomCode.trim().toUpperCase()
  const hash = hashCode(normalized)
  const adjective = ADJECTIVES[hash % ADJECTIVES.length]
  const noun = NOUNS[(hash >> 3) % NOUNS.length]
  return `${adjective} ${noun}`
}
