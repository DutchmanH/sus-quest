<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Project overview
SusQuest is a real-time multiplayer social party game (Next.js 16, Supabase, OpenAI). Players join rooms, receive AI-generated questions/sidequests, and try to identify the "sus" player.

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
