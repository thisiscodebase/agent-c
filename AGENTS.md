# 🍊 Agent C

Internal lookup-and-synthesis assistant for CodeBase, built with Eve and Next.js
(see `docs/ROADMAP.md` / `docs/PROGRESS.md`).

## Quick Reference

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `pnpm install`     | Install dependencies           |
| `pnpm dev`         | Start Next.js + Eve dev server |
| `pnpm build`       | Production build               |
| `pnpm typecheck`   | TypeScript check               |
| `pnpm db:generate` | Generate Drizzle migrations    |
| `pnpm db:migrate`  | Apply migrations               |

## Structure

```
agent-c/
├── agent/          # Eve agent (channels, tools, skills, connections)
├── app/            # Next.js App Router UI
├── components/     # React UI (chat, shadcn, AI Elements)
├── server/         # Auth, db, connectors registry, internal API
├── shared/         # Cross-layer types and config
└── docs/           # Architecture, environment, customization, progress
```

## Documentation

- [Deployment](docs/DEPLOYMENT.md) — Local + production configuration
- [Architecture](docs/ARCHITECTURE.md) — System design, connectors, search
- [Connect](docs/CONNECT.md) — Vercel Connect vs DIY, pricing, demo setup
- [Platform interop](docs/PLATFORM_INTEROP.md) — Platform MCP env + Connect/OIDC production checklist
- [Environment](docs/ENVIRONMENT.md) — Env vars + Connect provisioning
- [Customization](docs/CUSTOMIZATION.md) — Diff from upstream template
- [Prompt review](docs/PROMPT_REVIEW.md) — Instruction/cost analysis and improvement plan
- [Progress](docs/PROGRESS.md) — Phase status
- [README](README.md) — Quick start and feature overview

## Eve Framework

This project uses Eve with Next.js (`eve/next`, `withEve()`). Before writing
agent code, read the relevant guide in `node_modules/eve/docs/`.

## Connectors (Phase 3)

Live lookup sources (MCP / search tools), registered in
[`server/connectors.ts`](server/connectors.ts) and
[`agent/connections/`](agent/connections/):

- Drive — temporary REST tools (`search_drive`, `list_recent_drive`,
  `read_drive_file`) via Connect OAuth on `drivemcp.googleapis.com/agent-c`
  (hosted Drive MCP bypassed until Google’s data plane works)
- HubSpot — `mcp.hubspot.com` (app-scoped default)
- Notion — `mcp.notion.com/mcp` (per-user)
- Tally — `api.tally.so/mcp` (per-user)
- Asana — `mcp.asana.com/v2/mcp` (per-user; pre-registered MCP OAuth app)
- Retool — `https://thisiscodebase.retool.com/mcp` (per-user OAuth; `mcp:read` / `mcp:write`)
- Slack search — `agent/tools/search_slack.ts` on Connect app `slack/agent-c`
- CodeBase Platform — `PLATFORM_MCP_URL` + shared bearer (app-scoped env; see
  [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md)). Read-only for internal release.
- Companies House — REST tools (`search_companies_house`, `get_company_profile`,
  `get_company_officers`, `list_company_filings`) via shared `COMPANIES_HOUSE_API_KEY`
  (not Connect; public data).

UIDs: [`shared/connect.ts`](shared/connect.ts). Provision Connect connectors via
`vercel connect` — see [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md).

## Internal API Pattern

The Eve agent calls the web service over HTTP:

```
agent/lib/*-internal.ts  →  /api/internal/*  →  server/utils/*
```

Authenticated with `Authorization: Bearer <INTERNAL_API_SECRET>`. See
[`server/utils/internal-api.ts`](server/utils/internal-api.ts).

## Memory Flow

1. **Session injection** — [`agent/instructions.ts`](agent/instructions.ts) on
   `session.started`
2. **Agent save** — [`agent/tools/save_memory.ts`](agent/tools/save_memory.ts)
   with web approval UI
3. **Profile UI** — import, view, edit, delete on Settings → Profile

Categories: [`shared/types/memory.ts`](shared/types/memory.ts). One prose block
per category; saves replace the full block.

## Customization Checklist

- [`shared/agent.ts`](shared/agent.ts) — branding
- [`agent/lib/base-instructions.ts`](agent/lib/base-instructions.ts) — persona
- [`agent/channels/slack.ts`](agent/channels/slack.ts) — Slack Connect slug
- [`shared/models.ts`](shared/models.ts) + [`flags.ts`](flags.ts) — model tiers / Flags
- [`shared/connect.ts`](shared/connect.ts) — connector UIDs

See [docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md) for details.

## Model routing (Flags)

Agent and nano models are selected via Vercel Flags (see [`flags.ts`](flags.ts)
and [`shared/models.ts`](shared/models.ts)):

| Flag | Default |
|------|---------|
| `agent-tier` | `chat` |
| `agent-nano-model` | `openai/gpt-5.4-nano` |
| `agent-chat-model` | `openai/gpt-5.6-luna` |
| `agent-premium-model` | `anthropic/claude-sonnet-5` |
| `agent-extreme-model` | `openai/gpt-5.6-sol` |

Eve resolves the agent model on `session.started` via
`/api/internal/model-routing`. Model flags accept any AI Gateway
`provider/model` string (no code deploy). Requests set Gateway
`disallowPromptTraining: true` and `zeroDataRetention: true`, except
`xai/…` models which omit ZDR (no ZDR provider) while keeping no-training.
Agent tiers use `reasoning: "high"`.

## Cursor Cloud specific instructions

### Services

| Service | How to run | Notes |
| ------- | ---------- | ----- |
| **Next.js + Eve** | `pnpm dev` | Single process (`withEve()`). App at `http://localhost:3000`; Eve health at `/eve/v1/health`. |
| **Postgres** | local cluster on **port 54322** | Matches `.env.example` / `supabase start` defaults (`postgres:postgres@127.0.0.1:54322/postgres`). This environment uses system PostgreSQL 16 (not the Supabase CLI). Ensure it is up before `pnpm dev`: `pg_lsclusters` / `sudo pg_ctlcluster 16 main start`. |
| Connectors / Platform MCP / Slack | optional | Not required to boot or exercise chat UI, artifacts, profile, or leaderboard. |

Standard install/migrate/run commands live in the Quick Reference above and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Lint/typecheck is `pnpm typecheck`; unit tests are `pnpm test` (no separate ESLint script).

### Gotchas

- **Node must be ≥ 24** (`engines` / CI). The cloud image may expose an older Node earlier on `PATH` via `/exec-daemon/node`. Prefer the Node 24 install under nvm; shims in `/usr/local/cargo/bin` (ahead of `/exec-daemon`) keep `node`/`pnpm` on 24.
- **`.env.local` line endings**: if secrets look correct but Better Auth sessions always fail, strip CR (`\r`) from `.env.local`. Windows-sourced env files make `BETTER_AUTH_SECRET` disagree between the shell and Next’s dotenv loader.
- **Migrations**: `pnpm db:migrate` applies Drizzle (`server/db/migrations`). Also apply hand-written SQL under `supabase/migrations/` (e.g. `psql "$DATABASE_URL" -f …`) for artifacts / usage meter / feedback tables. Optional fixtures: `pnpm db:seed`.
- **Auth**: Google Workspace OAuth only. Empty `GOOGLE_*` still boots the app; login needs real OAuth client redirect `http://localhost:3000/api/auth/callback/google`. Seeded `@example.com` users are DB fixtures, not Google login accounts.
- **AI Gateway**: chat model replies need `VERCEL_OIDC_TOKEN` (via `vercel env pull`) or `AI_GATEWAY_API_KEY`. App and Eve health work without it; turns fail at inference time.
- Do **not** put `experimentalServices` back into `vercel.json` — it breaks `/eve/v1/*` routing (see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)).
