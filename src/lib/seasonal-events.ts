import type { SeasonalPromptContext, SeasonalTheme } from '@/types'

interface SeasonalEventDefinition {
  key: SeasonalTheme
  month: number
  day: number
  label: string
  shortInstructionNl: string
  shortInstructionEn: string
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
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
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
