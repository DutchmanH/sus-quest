import type { SeasonalPromptContext, SeasonalTheme } from '@/types'

interface SeasonalEventDefinition {
  key: SeasonalTheme
  month: number
  day: number
  label: string
  shortInstructionNl: string
  shortInstructionEn: string
}

export interface SeasonalHint {
  key: SeasonalTheme
  emoji: string
  label: string
  message: string
}

const FIXED_EVENTS: SeasonalEventDefinition[] = [
  {
    key: 'koningsdag',
    month: 4,
    day: 27,
    label: 'Koningsdag',
    shortInstructionNl: 'Voeg 1 of 2 speelse oranje/Koningsdag vragen toe.',
    shortInstructionEn: 'Add 1-2 playful orange/King\'s Day themed prompts.',
  },
  {
    key: 'sinterklaas',
    month: 12,
    day: 5,
    label: 'Sinterklaas',
    shortInstructionNl: 'Voeg 1 of 2 luchtige Sinterklaas surprises-stijl vragen toe.',
    shortInstructionEn: 'Add 1-2 light Sinterklaas/surprise style prompts.',
  },
  {
    key: 'kerst',
    month: 12,
    day: 25,
    label: 'Kerst',
    shortInstructionNl: 'Voeg 1 of 2 gezellige kersttafel vragen toe.',
    shortInstructionEn: 'Add 1-2 cozy holiday dinner themed prompts.',
  },
  {
    key: 'oud_en_nieuw',
    month: 12,
    day: 31,
    label: 'Oud en Nieuw',
    shortInstructionNl: 'Voeg 1 of 2 nieuwjaarsresolutie/fireworks vragen toe.',
    shortInstructionEn: 'Add 1-2 new year resolution/fireworks prompts.',
  },
  {
    key: 'carnaval',
    month: 2,
    day: 15,
    label: 'Carnaval',
    shortInstructionNl: 'Voeg 1 of 2 verkleed/feestgedrag prompts toe.',
    shortInstructionEn: 'Add 1-2 costume/party behavior prompts.',
  },
]

const CUSTOM_EVENTS: SeasonalEventDefinition[] = []

const EVENT_HINTS: Array<{
  key: SeasonalTheme
  month: number
  day: number
  emoji: string
  beforeDays: number
  afterDays: number
  messages: string[]
}> = [
  {
    key: 'koningsdag',
    month: 4, day: 27,
    emoji: '🧡',
    beforeDays: 2, afterDays: 1,
    messages: [
      'Alles staat al in het oranje — gooi er wat koningsdag-vragen in?',
      'Over een paar dagen is het Koningsdag. Oranje chaos in de vragen?',
      'Gisteren was het Koningsdag. Had je moeten gebruiken 😅',
    ],
  },
  {
    key: 'sinterklaas',
    month: 12, day: 5,
    emoji: '🎁',
    beforeDays: 3, afterDays: 1,
    messages: [
      'Sinterklaas komt eraan — steek een surprise in de vragen?',
      'Het is bijna pakjesavond! Voeg wat Sinterklaas-sfeertje toe?',
      'Gisteren was pakjesavond — de pepernoten zijn op maar de vragen nog niet.',
    ],
  },
  {
    key: 'kerst',
    month: 12, day: 25,
    emoji: '🎄',
    beforeDays: 5, afterDays: 2,
    messages: [
      'Het ruikt naar kerstboom — gooi er wat kerstsfeer in?',
      'Kerst is bijna hier. Laat de vragen ook gezellig worden?',
      'Kerst is net geweest — maar de kerstsweaters zitten nog aan, toch?',
    ],
  },
  {
    key: 'oud_en_nieuw',
    month: 12, day: 31,
    emoji: '🎆',
    beforeDays: 3, afterDays: 1,
    messages: [
      'Oudjaar is bijna — vuurwerk én sus-vragen in één avond?',
      'Nieuwjaarsnacht staat voor de deur. Voeg wat oud & nieuw-energie toe?',
      'Het is net nieuwjaar — resoluties al gebroken? Goede vragen voor.',
    ],
  },
  {
    key: 'carnaval',
    month: 2, day: 15,
    emoji: '🎭',
    beforeDays: 4, afterDays: 2,
    messages: [
      'Carnaval is begonnen — verkleed én sus in één klap?',
      'Bijna carnaval! Voeg wat feestgedrag-vragen toe voor de sfeer?',
      'Carnaval is net achter de rug. De kostuum-energie zit er nog in.',
    ],
  },
]

function getAmsterdamYMD(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  return {
    year: parseInt(parts.find(p => p.type === 'year')!.value),
    month: parseInt(parts.find(p => p.type === 'month')!.value),
    day: parseInt(parts.find(p => p.type === 'day')!.value),
  }
}

function calendarDaysBetween(
  from: { year: number; month: number; day: number },
  to: { year: number; month: number; day: number }
): number {
  const a = Date.UTC(from.year, from.month - 1, from.day)
  const b = Date.UTC(to.year, to.month - 1, to.day)
  return Math.round((b - a) / 86_400_000)
}

export function getSeasonalHint(now?: Date): SeasonalHint | null {
  const date = now ?? new Date()
  const today = getAmsterdamYMD(date)
  for (const event of EVENT_HINTS) {
    const eventDate = { year: today.year, month: event.month, day: event.day }
    const diff = calendarDaysBetween(today, eventDate)
    if (diff >= 0 && diff <= event.beforeDays) {
      // Before the event
      const msgIndex = event.beforeDays - diff
      const message = event.messages[Math.min(msgIndex, event.messages.length - 2)] ?? event.messages[0]
      return { key: event.key, emoji: event.emoji, label: event.key, message }
    }
    if (diff < 0 && Math.abs(diff) <= event.afterDays) {
      // After the event
      const message = event.messages[event.messages.length - 1]
      return { key: event.key, emoji: event.emoji, label: event.key, message }
    }
  }
  return null
}

const MANUAL_THEME_CONTEXT: Record<SeasonalTheme, SeasonalEventDefinition> = {
  koningsdag: FIXED_EVENTS[0],
  sinterklaas: FIXED_EVENTS[1],
  kerst: FIXED_EVENTS[2],
  oud_en_nieuw: FIXED_EVENTS[3],
  carnaval: FIXED_EVENTS[4],
  custom: {
    key: 'custom',
    month: 1,
    day: 1,
    label: 'Custom thema',
    shortInstructionNl: 'Voeg 1 of 2 subtiele thematische vragen toe die passen bij het gekozen event.',
    shortInstructionEn: 'Add 1-2 subtle themed prompts matching the selected event.',
  },
}

function toContext(definition: SeasonalEventDefinition, source: 'manual' | 'calendar'): SeasonalPromptContext {
  return {
    key: definition.key,
    source,
    label: definition.label,
    shortInstructionNl: definition.shortInstructionNl,
    shortInstructionEn: definition.shortInstructionEn,
  }
}

export function getManualSeasonalContext(theme: SeasonalTheme | null | undefined): SeasonalPromptContext | null {
  if (!theme) return null
  const definition = MANUAL_THEME_CONTEXT[theme]
  if (!definition) return null
  return toContext(definition, 'manual')
}

export function getCalendarSeasonalContext(date: Date): SeasonalPromptContext | null {
  const { month, day } = getAmsterdamYMD(date)
  const match = [...CUSTOM_EVENTS, ...FIXED_EVENTS].find((event) => event.month === month && event.day === day)
  if (!match) return null
  return toContext(match, 'calendar')
}

export function resolveSeasonalContext(input: {
  manualTheme?: SeasonalTheme | null
  now?: Date
}): SeasonalPromptContext | null {
  const manual = getManualSeasonalContext(input.manualTheme)
  if (manual) return manual
  return getCalendarSeasonalContext(input.now ?? new Date())
}
