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
- Domain-restriction parameter (`hd`) for CodeBase's Workspace domain —
  confirm whether this is an env var or a config value in `auth.ts`; either
  way it belongs alongside the above.

## Changed — persistence (`web`, and `eve` if it holds its own DB client)

NuxtHub's SQLite/D1 connection variables are replaced with a Postgres
connection string against Supabase:

- `DATABASE_URL` — Supabase Postgres connection string (direct connection or
  pooled via Supavisor/PgBouncer, depending on whether `eve` needs a
  persistent connection or transaction-style pooling — confirm which mode
  Drizzle should target), replacing whatever NuxtHub-specific variable
  upstream uses for its SQLite binding.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`, if
  any client-side Supabase SDK usage is added beyond Drizzle-over-Postgres)
  — only needed if something beyond raw Postgres access is used, e.g.
  Supabase Storage for artifact exports or the Supabase client for
  RLS-aware queries. If Drizzle talks to Supabase purely as a Postgres
  connection string, these may not be required at all — confirm during
  implementation.
- `pgvector` is enabled per-project via the Supabase dashboard/CLI
  (`create extension vector`), not something to gate behind a separate
  migration flag.

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
- The internal bearer-token variable used for `web` → `eve` calls.
- Model/provider API key(s) for the Eve agent runtime.

## Action item

This file should be treated as provisional until someone actually runs
`vercel connect` provisioning for the Drive and HubSpot connectors and sets
up the Supabase project — replace the descriptive bullets above with the
real variable names once that's done, the same way upstream's
`ENVIRONMENT.md` lists exact names rather than descriptions.
