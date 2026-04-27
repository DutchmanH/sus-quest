import type { SeasonalSource, SeasonalTheme } from '@/types'

export const ALLOWED_SEASONAL_THEMES: SeasonalTheme[] = [
  'koningsdag',
  'sinterklaas',
  'kerst',
  'oud_en_nieuw',
  'carnaval',
  'custom',
]

export function normalizeSeasonalThemeInput(input: unknown): {
  seasonal_theme: SeasonalTheme | null
  seasonal_source: SeasonalSource
} {
  if (input === null || input === undefined || input === '') {
    return { seasonal_theme: null, seasonal_source: 'none' }
  }

  if (typeof input === 'string' && ALLOWED_SEASONAL_THEMES.includes(input as SeasonalTheme)) {
    return { seasonal_theme: input as SeasonalTheme, seasonal_source: 'manual' }
  }

  throw new Error('INVALID_SEASONAL_THEME')
}
