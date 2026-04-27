import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildRoundsPrompt } from '@/lib/openai'

describe('buildRoundsPrompt', () => {
  it('includes seasonal instructions when context exists', () => {
    const prompt = buildRoundsPrompt({
      roundCount: 10,
      settingCtx: 'feest context',
      groepCtx: 'vrienden context',
      boldnessCtx: 'blozen context',
      playerCount: 4,
      seasonalContext: {
        key: 'koningsdag',
        source: 'calendar',
        label: 'Koningsdag',
        shortInstructionNl: 'Voeg 1-2 oranje vragen toe',
        shortInstructionEn: 'Add 1-2 orange prompts',
      },
    })

    assert.match(prompt, /SEIZOENS-THEMA:/)
    assert.match(prompt, /Voeg in totaal 1 of 2 seasonal rondes toe/)
    assert.match(prompt, /Koningsdag/)
  })

  it('omits seasonal block when context is missing', () => {
    const prompt = buildRoundsPrompt({
      roundCount: 10,
      settingCtx: 'feest context',
      groepCtx: 'vrienden context',
      boldnessCtx: 'blozen context',
      playerCount: 4,
      seasonalContext: null,
    })

    assert.doesNotMatch(prompt, /SEIZOENS-THEMA:/)
  })
})
