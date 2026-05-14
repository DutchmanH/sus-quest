<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Project overview
SusQuest is a real-time multiplayer social party game (Next.js 16, Supabase, OpenAI). Players join rooms, receive AI-generated questions/sidequests, and try to identify the "sus" player.

---

### Game design — spelregels (lees dit altijd eerst)

#### Ronde-structuur
Een game bestaat uit meerdere **rondes**. Elke ronde bevat:
1. Meerdere **main questions** (aantal instelbaar via `questions_per_cycle`)
2. Exact **één sidequest** voor één willekeurige speler — actief tijdens de HELE ronde
3. Een verplicht **beschuldig-/stemmoment** aan het einde (accusation phase)
4. Een **reveal** van wie de sus-speler was + puntenverdeling

**NIET:** 1 vraag = 1 ronde. **WEL:** 1 ronde = meerdere vragen + 1 sidequest + 1 beschuldigmoment.

#### Database-architectuur vs. gebruikerstaal
De DB slaat elke vraag als een aparte rij op (`round_kind='play'`). Dit is een implementatiedetail:
- `round_kind='intro'` → intro-ronde (1 per game)
- `round_kind='play'` → vraag-rij binnen een logische ronde
- `round_kind='accuse_gate'` → het beschuldigmoment aan het einde van een ronde
- `play_cycles` in de `rooms` tabel = aantal **logische rondes**
- `questions_per_cycle` = aantal vragen per logische ronde

#### Sidequest design
- Concreet, observeerbaar, uitvoerbaar **gedurende de hele ronde**
- Sociale manipulatie: "Laat iemand het woord 'geel' zeggen", "Zorg dat iemand jouw naam noemt", "Laat iemand van mening veranderen"
- VERBODEN: "wees verdacht", "doe iets opvallends", "gedraag je raar", micro-acties die maar 1 vraag duren

#### Suspicious fact (vroeger: fakeTask)
Spelers zonder sidequest zien een `suspicious_fact` — geen nep-opdracht, maar een paranoïa-versterker:
- "Feit: de persoon die het hardst ontkent heeft meestal iets te verbergen"
- "Let op: mensen die te snel antwoorden zijn zelden onschuldig"
- DB-kolomnamen: `suspicious_fact_nl` / `suspicious_fact_en`

#### Accusation phase
- Verplicht: elke speler moet stemmen (geen skip/"Niemand" optie)
- Elke speler kiest exact één andere speler
- Timer: 15 seconden, daarna host-only reveal

#### Scoringsmodel (geen negatieve punten)
| Situatie | Sus-speler | Andere spelers |
|---|---|---|
| Gepakt door meerderheid (>50% votes op sus) | **+0** | Correcte stemmer: **+1** |
| Niet gepakt, wel votes op sus | **+2** | Foute stemmer: **+0** |
| Helemaal niet gekozen (0 votes) | **+3** | Foute stemmer: **+0** |

Meerderheid = meer dan 50% van de stemmers (sus-speler telt niet mee als stemmer).

---

### Required environment variables
Copy `.env.example` to `.env.local` and fill in real values. Required secrets:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase project credentials
- `OPENAI_API_KEY` — OpenAI API key for game round generation

### Running services
| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server on port 3000 |
| `npm run build` | Production build (uses Turbopack) |
| `npm run lint` | ESLint (flat config, `eslint` command with no args) |

### Gotchas
- The build will log `fetch failed` / `ENOTFOUND` errors for Supabase URLs if using placeholder env vars. This is expected — static generation of the admin page tries to reach the Supabase API at build time. The build still succeeds.
- ESLint reports pre-existing warnings/errors in game components (react-hooks rules). These are in existing code and not introduced by the agent.
- No automated test suite exists (`npm test` is not configured). Validate changes via lint + build + manual browser testing.
- The lockfile is `package-lock.json` — use `npm` (not pnpm/yarn).
