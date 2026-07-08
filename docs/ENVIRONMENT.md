# Environment

Delta from upstream `personal-agent-template`'s `ENVIRONMENT.md`. Start from
the upstream file as the source of truth for anything not listed as changed
below — this document only covers what's added, removed, or moved between
services for the CodeBase fork.

As in upstream, variables are split per service: `web` (Nuxt/Nitro or its
replacement) and `eve` (the agent runtime). Get the split right — `eve`
should hold only what it needs to run tools/connections/channels; user-auth
concerns stay on `web`.

## Added — `web` only

Google OAuth for Better Auth. This lives entirely on `web`: `eve` never
authenticates end users directly — it only receives already-authenticated
calls, from `web` over the internal bearer-token API, and from Slack via a
Vercel Connect–verified webhook. There is no reason to duplicate these onto
`eve`.

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_WORKSPACE_DOMAIN` — CodeBase's Workspace domain. Resolved: this is
  a plain env var, read directly into the `hd` option of Better Auth's
  Google provider config in `server/utils/auth.ts` (not a Better Auth
  built-in env var name — just app config sourced from the environment).

## Changed — persistence (`web`, and `eve` if it holds its own DB client)

NuxtHub's SQLite/D1 connection variables are replaced with a Postgres
connection string against Supabase:

- `DATABASE_URL` — Supabase Postgres connection string. **Resolved: pooled,
  via Supavisor in transaction mode** (port `6543` on a hosted project;
  `127.0.0.1:54322` for local `supabase start`) — Vercel Functions are
  serverless and would otherwise exhaust Postgres's direct connection limit.
  The driver is configured with `{ prepare: false }` since transaction-mode
  pooling doesn't support prepared statements.
- `DIRECT_URL` — the unpooled connection, used only by `drizzle-kit`
  migrations (`drizzle.config.ts`).
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — **not currently used.**
  Drizzle talks to Supabase purely as a Postgres connection string via
  `postgres-js` (`server/db/client.ts`); add these only if something beyond
  raw Postgres access is introduced later (e.g. Supabase Storage for
  artifact exports).
- `pgvector` is enabled via a Drizzle-generated migration
  (`create extension if not exists vector;`) rather than the Supabase
  dashboard, so it's tracked the same way as the rest of the schema.

## Added — connectors (`eve`)

Beyond the Slack connector variables already present upstream:

- Google Drive: Vercel Connect generic OAuth connector credentials/config
  for Drive (per-user token subject — see `ARCHITECTURE.md`). Exact variable
  names depend on how the generic OAuth connector is provisioned via the
  Vercel Connect dashboard/CLI; document the actual names here once
  provisioned.
- HubSpot: either generic OAuth connector credentials, or an MCP server URL
  + auth token if using a third-party HubSpot MCP (e.g. Composio) instead of
  Vercel Connect's generic OAuth path.

## Removed

- Any Sendblue/iMessage-related variables (API keys, phone number config) —
  the channel itself is deleted, per `CUSTOMIZATION.md`.
- Linear connector credentials — connection removed.

## Unchanged from upstream

- Slack connector/channel variables (the surface itself is retained as-is).
- The internal bearer-token variable used for `web` → `eve` calls
  (`INTERNAL_API_SECRET`).
- Model/provider API key(s) for the Eve agent runtime.

## Action item

Google auth and Postgres/Supabase variables above are now concrete (Phase 0-2
implemented). The Drive and HubSpot connector variable names in the section
above remain provisional until Phase 3's `vercel connect` provisioning
(Drive) and HubSpot MCP server setup actually happen — replace those
descriptive bullets with real variable names at that point.
