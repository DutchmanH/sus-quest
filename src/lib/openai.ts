import OpenAI from 'openai'
import type { GeneratedRound, Vibe, ContentLevel } from '@/types'

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
  return new OpenAI({ apiKey })
}

const VIBE_DESCRIPTIONS: Record<Vibe, string> = {
  chill: 'ontspannen en vriendelijk, luchtige vragen, geen directe confrontaties',
  chaos: 'chaotisch en onvoorspelbaar, wild en onverwacht, alles kan',
  awkward: 'ongemakkelijk en cringe, sociaal onhandig, pijnlijk grappig',
  spicy: 'pittig en provocerend, dicht op de grens, beetje gevaarlijk',
  comp: 'competitief en strategisch, winnen telt, slim spelen',
}

const CONTENT_DESCRIPTIONS: Record<ContentLevel, string> = {
  safe: 'volledig veilig voor alle leeftijden, geen alcohol/seks/drugs referenties',
  spicy: 'voor volwassenen, lichte seksuele hints, drankspel referenties zijn ok',
  extra_spicy: 'heel erg voor volwassenen, expliciete grappige inhoud, bold en ongecensureerd',
}

export async function generateRounds(
  roundCount: number,
  vibe: Vibe,
  contentLevel: ContentLevel,
  playerCount: number
): Promise<GeneratedRound[]> {
  const prompt = `Je bent de spelmeester van SusQuest, een sociaal partygame gebaseerd op wantrouwen en geheime missies.

Genereer precies ${roundCount} speelrondes.

Vibe: ${vibe} — ${VIBE_DESCRIPTIONS[vibe]}
Content: ${contentLevel} — ${CONTENT_DESCRIPTIONS[contentLevel]}
Aantal spelers: ${playerCount}

Regels:
- Ongeveer 70% van de rondes heeft een echte sidequest (hasSidequest: true)
- Bij een sidequest: playerIndex is een getal van 0 tot ${playerCount - 1} (willekeurig)
- Opdrachten zijn KORT en DIRECT — max 2 zinnen, geen uitleg, geen als/dan constructies
- Toon: speels, licht sarcastisch, mysterieus
- Geef ALTIJD zowel Nederlandse (nl) als Engelse (en) versies
- mainQuestion stelt een vraag aan de hele groep over hun gedrag/keuzes/persoonlijkheid
- sidequest is een geheime persoonlijke opdracht die iemand ongemerkt moet uitvoeren
- fakeTask is een nep-opdracht die niks opvalt (bijv. "Doe niets opvallends deze ronde")

Antwoord als JSON object met een "rounds" array, geen uitleg, geen markdown:
{
  "rounds": [
    {
      "mainQuestion": { "nl": "...", "en": "..." },
      "hasSidequest": true,
      "sidequest": {
        "playerIndex": 2,
        "text": { "nl": "...", "en": "..." }
      },
      "fakeTask": { "nl": "...", "en": "..." }
    }
  ]
}

Bij hasSidequest: false, laat het sidequest veld weg.`

  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0].message.content ?? '{}'

  let parsed: { rounds: GeneratedRound[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('OpenAI returned invalid JSON')
  }

  if (!Array.isArray(parsed.rounds) || parsed.rounds.length === 0) {
    throw new Error(`OpenAI returned invalid rounds: ${raw}`)
  }

  return parsed.rounds
}
