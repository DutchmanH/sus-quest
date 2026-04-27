import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSeasonalThemeInput } from '@/lib/seasonal-theme'

describe('normalizeSeasonalThemeInput', () => {
  it('accepts null as no theme', () => {
    const result = normalizeSeasonalThemeInput(null)
    assert.deepEqual(result, {
      seasonal_theme: null,
      seasonal_source: 'none',
    })
  })

  it('accepts valid manual theme', () => {
    const result = normalizeSeasonalThemeInput('koningsdag')
    assert.deepEqual(result, {
      seasonal_theme: 'koningsdag',
      seasonal_source: 'manual',
    })
  })

  it('rejects invalid theme', () => {
    assert.throws(() => normalizeSeasonalThemeInput('halloween'))
  })
})
