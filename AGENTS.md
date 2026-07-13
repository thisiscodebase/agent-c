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
- [Progress](docs/PROGRESS.md) — Phase status
- [README](README.md) — Quick start and feature overview

## Eve Framework

This project uses Eve with Next.js (`eve/next`, `withEve()`). Before writing
agent code, read the relevant guide in `node_modules/eve/docs/`.

## Connectors (Phase 3)

Live lookup sources (MCP / search tools), registered in
[`server/connectors.ts`](server/connectors.ts) and
[`agent/connections/`](agent/connections/):

- Drive — `drivemcp.googleapis.com` (per-user)
- HubSpot — `mcp.hubspot.com` (app-scoped default)
- Notion — `mcp.notion.com/mcp` (per-user)
- Tally — `api.tally.so/mcp` (per-user)
- Slack search — `agent/tools/search_slack.ts` on Connect app `slack/agent-c`
- CodeBase Platform — `PLATFORM_MCP_URL` + shared bearer (app-scoped env; see
  [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md)). Read-only for internal release.

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
`/api/internal/model-routing`. Requests set Gateway
`disallowPromptTraining: true` and `zeroDataRetention: true`, except
`xai/grok-4.5` which omits ZDR (no ZDR provider) while keeping no-training.
Agent tiers use `reasoning: "high"`.
