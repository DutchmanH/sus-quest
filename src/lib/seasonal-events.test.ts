import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSeasonalContext } from '@/lib/seasonal-events'

describe('resolveSeasonalContext', () => {
  it('uses manual theme over calendar match', () => {
    const context = resolveSeasonalContext({
      manualTheme: 'kerst',
      now: new Date('2026-04-27T12:00:00.000Z'),
    })

    assert.equal(context?.key, 'kerst')
    assert.equal(context?.source, 'manual')
  })

  it('detects calendar event without manual theme', () => {
    const context = resolveSeasonalContext({
      now: new Date('2026-04-27T12:00:00.000Z'),
    })

    assert.equal(context?.key, 'koningsdag')
    assert.equal(context?.source, 'calendar')
  })

  it('returns null for regular day', () => {
    const context = resolveSeasonalContext({
      now: new Date('2026-06-10T12:00:00.000Z'),
    })

    assert.equal(context, null)
  })
})
