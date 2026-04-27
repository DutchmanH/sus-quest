import OpenAI from 'openai'
import type { GeneratedRound } from '@/types'

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
  return new OpenAI({ apiKey })
}

const SETTING_CONTEXT: Record<string, string> = {
  bank: 'De spelers zitten thuis op de bank. Sfeer: ontspannen, huiselijk. Opdrachten mogen verwijzen naar dingen in de woonkamer of keuken.',
  feest: 'De spelers zijn op een feest. Muziek op de achtergrond, minstens één iemand is al aangeschoten. Sociale dares passen goed. Het mag uitbundig.',
  after_midnight: 'Het is na middernacht. De remmen zijn los, niemand hoeft vroeg op. Vragen mogen dieper gaan, ongefilterder. Alles is bespreekbaar.',
  onderweg: 'De spelers zijn onderweg — trein, bus, vliegtuig of auto. Geen props mogelijk. Alle opdrachten moeten portable zijn, puur gedragsmatig.',
}

const GROEP_CONTEXT: Record<string, string> = {
  vrienden: 'De groep bestaat uit oude vrienden die elkaars geheimen al jaren kennen. Vragen mogen persoonlijk zijn, verwijzingen naar gedeelde ervaringen of karaktereigenschappen werken goed.',
  vreemden: 'De spelers kennen elkaar nog niet goed. Icebreaker energie — vragen helpen mensen zichzelf te laten zien. Niets te persoonlijk, wel activerend.',
  stelletjes: 'Er zitten stelletjes bij de groep. Relatie-dynamiek, jaloezie, flirten en loyaliteits-vragen zijn welkom in zowel hoofdvragen als sidequests.',
  familie: 'Het is een familieavond. Pijnlijk awkward mag, maar houd het relatief netjes. Familiespecifieke dynamieken (rollen, hiërarchie, tradities) mogen subtiel terugkomen.',
}

const BOLDNESS_CONTEXT: Record<string, string> = {
  gezellig: 'Content: volledig veilig voor iedereen. Geen seks, geen alcohol, geen drugsreferenties. Licht, grappig, niemand voelt zich ongemakkelijk.',
  blozen: 'Content: voor volwassenen. Lichte seksuele hints zijn ok. Iemand gaat zeker even blozen of ongemakkelijk lachen. Drankspel verwijzingen zijn prima.',
  niemand_veilig: 'Content: volledig ongecensureerd voor volwassenen. Bold sidequests, expliciete maar grappige inhoud. De groep is gewaarschuwd. Niemand is veilig.',
}

export async function generateRounds(
  roundCount: number,
  setting: string,
  boldness: string,
  playerCount: number,
  groep?: string
): Promise<GeneratedRound[]> {
  const settingCtx = SETTING_CONTEXT[setting] ?? SETTING_CONTEXT['feest']
  const groepCtx = groep ? (GROEP_CONTEXT[groep] ?? GROEP_CONTEXT['vrienden']) : GROEP_CONTEXT['vrienden']
  const boldnessCtx = BOLDNESS_CONTEXT[boldness] ?? BOLDNESS_CONTEXT['blozen']

  const prompt = `Je bent de spelmeester van SusQuest — een sociaal partygame gebaseerd op wantrouwen, geheime missies en groepsgedrag.

Genereer precies ${roundCount} speelrondes.

CONTEXT OVER DEZE GROEP:
- Locatie: ${settingCtx}
- Groep: ${groepCtx}
- ${boldnessCtx}
- Aantal spelers: ${playerCount}

SPELREGELS:
- Ongeveer 60-70% van de rondes heeft een echte sidequest (hasSidequest: true)
- Bij een sidequest: playerIndex is een getal van 0 tot ${playerCount - 1}
- Opdrachten zijn KORT en DIRECT — max 2 zinnen, geen uitleg, geen als/dan constructies
- mainQuestion stelt een vraag aan de hele groep: over gedrag, keuzes, persoonlijkheid of sociale dynamiek. De vraag moet iets onthullen over wie iemand echt is.
- sidequest is een geheime persoonlijke opdracht voor ÉÉN speler. Die speler moet dit ongemerkt uitvoeren tijdens het beantwoorden van de hoofdvraag. Subtiel of afleidend, maar uitvoerbaar.
- fakeTask is wat de ANDERE spelers zien op hun kaart (als er een sidequest is). Dit is GEEN opdracht — het is een grappig, ironisch of licht uitdagend feitje of observatie dat past bij de vraag. Voorbeelden: "Wacht even... is iedereen hier eigenlijk wel te vertrouwen?", "Feit: mensen die te hard lachen zijn altijd verdacht.", "Kleine uitdaging: kijk de persoon rechts van je 3 seconden recht in de ogen." Houd het kort, grappig, en niet verdacht.
- Toon: speels, licht sarcastisch, mysterieus — denk detective-vibe met een vleugje chaos
- Pas de content aan op de bovenstaande context. Maak de vragen specifiek voor deze setting en groep, niet generiek.
- Geef ALTIJD zowel Nederlandse (nl) als Engelse (en) versies

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

Bij hasSidequest: false, laat het sidequest veld volledig weg.`

  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
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
