import OpenAI from 'openai'
import type { GeneratedRound, SeasonalPromptContext } from '@/types'

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

const GENERATION_MODEL = 'gpt-4o'
const INPUT_COST_PER_1M_TOKENS_USD = 5
const OUTPUT_COST_PER_1M_TOKENS_USD = 15

export interface GenerationUsage {
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  inputCostUsd: number
  outputCostUsd: number
  totalCostUsd: number
}

export interface GenerateRoundsResult {
  rounds: GeneratedRound[]
  usage: GenerationUsage
}

export async function generateRounds(
  numRounds: number,
  questionsPerRound: number,
  setting: string,
  boldness: string,
  playerCount: number,
  groep?: string,
  seasonalContext?: SeasonalPromptContext | null
): Promise<GenerateRoundsResult> {
  const settingCtx = SETTING_CONTEXT[setting] ?? SETTING_CONTEXT['feest']
  const groepCtx = groep ? (GROEP_CONTEXT[groep] ?? GROEP_CONTEXT['vrienden']) : GROEP_CONTEXT['vrienden']
  const boldnessCtx = BOLDNESS_CONTEXT[boldness] ?? BOLDNESS_CONTEXT['blozen']

  const prompt = buildRoundsPrompt({
    numRounds,
    questionsPerRound,
    settingCtx,
    groepCtx,
    boldnessCtx,
    playerCount,
    seasonalContext,
  })

  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: GENERATION_MODEL,
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

  const promptTokens = completion.usage?.prompt_tokens ?? 0
  const completionTokens = completion.usage?.completion_tokens ?? 0
  const totalTokens = completion.usage?.total_tokens ?? promptTokens + completionTokens

  const inputCostUsd = (promptTokens / 1_000_000) * INPUT_COST_PER_1M_TOKENS_USD
  const outputCostUsd = (completionTokens / 1_000_000) * OUTPUT_COST_PER_1M_TOKENS_USD
  const totalCostUsd = inputCostUsd + outputCostUsd

  return {
    rounds: parsed.rounds,
    usage: {
      model: GENERATION_MODEL,
      promptTokens,
      completionTokens,
      totalTokens,
      inputCostUsd,
      outputCostUsd,
      totalCostUsd,
    },
  }
}

export function buildRoundsPrompt(input: {
  numRounds: number
  questionsPerRound: number
  settingCtx: string
  groepCtx: string
  boldnessCtx: string
  playerCount: number
  seasonalContext?: SeasonalPromptContext | null
}): string {
  const seasonalBlock = input.seasonalContext
    ? `\nSEIZOENS-THEMA:\n- Thema: ${input.seasonalContext.label}\n- Bron: ${input.seasonalContext.source}\n- Instructie (NL): ${input.seasonalContext.shortInstructionNl}\n- Instructie (EN): ${input.seasonalContext.shortInstructionEn}\n- Verwerk het thema in 1 of 2 rondes. De andere rondes blijven normaal.\n- Seizoensvragen moeten passen bij de gekozen boldness, setting en groep.\n`
    : ''

  return `Je bent de spelmeester van SusQuest — een sociaal partygame gebaseerd op wantrouwen, geheime missies en groepsgedrag.

Genereer precies ${input.numRounds} rondes. Elke ronde bevat precies ${input.questionsPerRound} vragen.

CONTEXT OVER DEZE GROEP:
- Locatie: ${input.settingCtx}
- Groep: ${input.groepCtx}
- ${input.boldnessCtx}
- Aantal spelers: ${input.playerCount}
${seasonalBlock}

RONDE-STRUCTUUR:
- Elke ronde heeft exact 1 sidequest voor 1 speler. Die sidequest loopt door tijdens ALLE vragen van die ronde.
- Na alle vragen in een ronde volgt een beschuldigmoment: wie had de sidequest?
- De sidequest moet dus uitvoerbaar en detecteerbaar zijn gedurende de volledige ronde, niet enkel tijdens één vraag.

SIDEQUEST REGELS:
- De sidequest is een geheime sociale manipulatieopdracht voor ÉÉN speler.
- De sidequest moet WAARNEEMBAAR zijn voor andere spelers tijdens het beschuldigmoment.
- VERBODEN: "wees verdacht", "doe iets opvallends", "gedraag je raar", micro-acties die maar 1 seconde duren.
- VERPLICHTE STIJL: sociale manipulatie over de hele ronde. Voorbeelden:
  "Zorg dat iemand jouw naam noemt tijdens een antwoord."
  "Laat iemand het woord 'geel' zeggen."
  "Zorg dat iemand van mening verandert."
  "Laat iemand naar zijn drankje kijken zonder dat jij ernaar wijst."
  "Zorg dat iemand je een compliment geeft."
- Schrijf de sidequest als 1 heldere imperatief. Geen uitleg, geen als/dan.
- De sidequest moet grappig, sociaal en licht uitdagend zijn — maar uitvoerbaar.

VRAGEN REGELS:
- mainQuestion stelt een vraag aan de HELE groep: over gedrag, keuzes, persoonlijkheid of sociale dynamiek.
- De vraag moet iets onthullen over wie iemand echt is, en een context bieden waarin de sidequest kan worden uitgevoerd.
- Vragen zijn KORT, DIRECT — max 2 zinnen.

SUSPICIOUS FACT REGELS:
- suspiciousFact is wat spelers ZONDER sidequest op hun kaart zien.
- Dit is GEEN opdracht. Het is een paranoïa-versterker: een grappig, ironisch verdacht feitje over menselijk gedrag.
- Voorbeelden: "Feit: de persoon die het hardst ontkent heeft meestal iets te verbergen.", "Let op: mensen die te snel antwoorden zijn zelden onschuldig.", "Verdachte mensen doen vaak alsof ze heel normaal zijn."
- Elk suspicious fact moet passen bij de sfeer van de vraag in die ronde.
- Houd het kort, grappig, en subtiel paranoïa-opwekkend.

TOON: speels, licht sarcastisch, mysterieus — detective-vibe met een vleugje chaos.
Pas content aan op setting en groep. Maak vragen specifiek, niet generiek.
Geef ALTIJD zowel Nederlandse (nl) als Engelse (en) versies.

Antwoord als JSON object met een "rounds" array, geen uitleg, geen markdown:
{
  "rounds": [
    {
      "sidequest": { "nl": "...", "en": "..." },
      "questions": [
        {
          "mainQuestion": { "nl": "...", "en": "..." },
          "suspiciousFact": { "nl": "...", "en": "..." }
        }
      ]
    }
  ]
}

Elke ronde heeft exact ${input.questionsPerRound} vragen in de "questions" array. Het sidequest veld is verplicht en mag nooit leeg zijn.`
}
