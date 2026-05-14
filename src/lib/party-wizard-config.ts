import type { Boldness, Groep, SeasonalTheme, Setting } from '@/types'

export const PARTY_VIBE_OPTIONS: { value: Setting; emoji: string; label: string; sub: string }[] = [
  { value: 'bank', emoji: '🛋️', label: 'Op de bank', sub: 'thuis, ontspannen, lekker lui' },
  { value: 'feest', emoji: '🎉', label: 'Op een feest', sub: 'muziek aan, iemand al weg' },
  { value: 'after_midnight', emoji: '🌙', label: 'After midnight', sub: 'remmen los, alles mag' },
  { value: 'onderweg', emoji: '✈️', label: 'Onderweg', sub: 'bus, trein of vliegtuig' },
]

export const PARTY_GROEP_OPTIONS: { value: Groep; emoji: string; label: string; sub: string }[] = [
  { value: 'vrienden', emoji: '🐺', label: 'Oude vrienden', sub: 'jullie kennen elkaars geheimen' },
  { value: 'vreemden', emoji: '🤝', label: 'Nieuwe mensen', sub: 'icebreaker energy' },
  { value: 'stelletjes', emoji: '💕', label: 'Stelletjes erbij', sub: 'relationship tension welcome' },
  { value: 'familie', emoji: '😬', label: 'Familie', sub: 'het is een familieavond…' },
]

export const PARTY_BOLDNESS_OPTIONS: {
  value: Boldness
  emoji: string
  label: string
  sub: string
  color: string
}[] = [
  { value: 'gezellig', emoji: '😊', label: 'Gewoon gezellig', sub: 'fun voor iedereen, geen slachtoffers', color: 'var(--mint)' },
  { value: 'blozen', emoji: '🌶️', label: 'Iemand gaat blozen', sub: 'licht provocerend, voor volwassenen', color: 'var(--gold)' },
  {
    value: 'niemand_veilig',
    emoji: '🔥',
    label: 'Niemand is veilig',
    sub: 'volledig ongecensureerd — jullie zijn gewaarschuwd',
    color: 'var(--coral)',
  },
]

export const PARTY_SEASONAL_THEME_OPTIONS: { value: SeasonalTheme; emoji: string; label: string; sub: string }[] = [
  { value: 'koningsdag', emoji: '🧡', label: 'Koningsdag', sub: 'oranje chaos en feestvibes' },
  { value: 'sinterklaas', emoji: '🎁', label: 'Sinterklaas', sub: 'surprises en ondeugende hints' },
  { value: 'kerst', emoji: '🎄', label: 'Kerst', sub: 'gezellig, scherp en familieproof-ish' },
  { value: 'oud_en_nieuw', emoji: '🎆', label: 'Oud & Nieuw', sub: 'resoluties, vuurwerk en chaos' },
  { value: 'carnaval', emoji: '🎭', label: 'Carnaval', sub: 'verkleed, uitbundig, beetje fout' },
  { value: 'custom', emoji: '✨', label: 'Aangepast thema', sub: 'speciaal voor jullie game' },
]

export function getQuestionsPerCycleCopy(count: number): { title: string; sub: string } {
  if (count <= 3) return { title: 'Sneller tempo', sub: 'vaak beschuldigen, hoog tempo' }
  if (count === 4) return { title: 'Gebalanceerd', sub: 'klassieke flow' }
  return { title: 'Meer opbouw', sub: 'meer tijd om verdacht te doen' }
}
