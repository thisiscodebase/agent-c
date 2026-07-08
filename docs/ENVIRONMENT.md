# Environment

Delta from upstream `personal-agent-template`'s `ENVIRONMENT.md`. Start from
the upstream file as the source of truth for anything not listed as changed
below — this document only covers what's added, removed, or moved between
services for the CodeBase fork.

As in upstream, variables are split per service: `web` (Next.js) and `eve`
(the agent runtime). Get the split right — `eve` should hold only what it
needs to run tools/connections/channels; user-auth concerns stay on `web`.

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

## Connectors (`eve` + `web`)

Connectors use [Vercel Connect](https://vercel.com/docs/connect). Runtime
tokens are minted via `@vercel/connect` — there are typically **no long-lived
provider API keys in `.env`** once connectors are created and attached.
UIDs live in [`shared/connect.ts`](../shared/connect.ts) and must match
`vercel connect list`.

For why Connect is used (vs pointing Eve directly at MCP URLs), DIY
replacement scope, and pricing at CodeBase scale, see
[Connect](CONNECT.md).

### Provisioning

From the linked Vercel project (after `vercel link`):

```bash
# Google Drive official MCP (Developer Preview) — bring your own GCP OAuth client
# Enable drive.googleapis.com + drivemcp.googleapis.com, then:
vercel connect create https://drivemcp.googleapis.com/mcp/v1 --name codebase-agent
vercel connect attach <drive-uid> --yes

# HubSpot official MCP — create an MCP Auth App in HubSpot first
# (Development → MCP Auth Apps), then:
vercel connect create mcp.hubspot.com --name codebase-agent
vercel connect attach <hubspot-uid> --yes

# Notion official MCP (OAuth-only hosted server)
vercel connect create mcp.notion.com --name codebase-agent
vercel connect attach <notion-uid> --yes

# Slack — reuse the existing channel app; expand scopes for Real-time Search
# (search:read.public, search:read.private, search:read.files, search:read.users)
# Channel credentials already use slack/v in agent/channels/slack.ts

vercel env pull
```

Update UIDs in `shared/connect.ts` if `vercel connect list` returns different
values than the placeholders (`oauth/drive-codebase-agent`,
`mcp.hubspot.com/codebase-agent`, `mcp.notion.com/codebase-agent`, `slack/v`).

### Drive (GCP)

Drive MCP requires a Google Cloud project with:

- APIs: `drive.googleapis.com`, `drivemcp.googleapis.com`
- OAuth consent (Internal for Workspace) and a Web application client
- Redirect URI matching Vercel Connect's callback for the custom OAuth connector
- Scopes: at least `https://www.googleapis.com/auth/drive.readonly`

Drive MCP is currently a **Google Workspace Developer Preview**.

### HubSpot

Create an MCP Auth App under HubSpot **Development → MCP Auth Apps**. Supply
the client ID/secret when creating the Connect connector for
`mcp.hubspot.com`. HubSpot assigns scopes at install time from the MCP tool
surface **and** from the object permissions you approve on the consent screen.

If chat tools return `AUTHORIZATION_ERROR` or `get_user_details` shows
`REQUIRES_REAUTHORIZATION` for all objects, the token likely only has the
base `oauth` scope. **Revoke** HubSpot in Settings → Integrations, reconnect,
and approve contacts/companies/deals on the HubSpot permission picker. Also
remove the old install under HubSpot → Development → MCP Auth Apps if needed.

### Notion

Hosted Notion MCP at `https://mcp.notion.com/mcp` uses OAuth 2.0 + PKCE only
(no bearer/integration token on this endpoint). Connect brokers the browser
consent flow per user.

### Slack search

Same Connect app as the Slack channel (`slack/v`). Expand the app's user
scopes for Real-time Search; do **not** use legacy `search:read`. Account
linking (Settings → Integrations → Slack link code) is unchanged and still
requires `INTERNAL_API_SECRET`.

## Removed

- Any Sendblue/iMessage-related variables (API keys, phone number config) —
  the channel itself is deleted, per `CUSTOMIZATION.md`.
- Linear connector credentials — connection removed.
- GitHub connector — removed from the product surface in Phase 3 (not a
  CodeBase lookup source).

## Unchanged from upstream

- The internal bearer-token variable used for `web` → `eve` calls
  (`INTERNAL_API_SECRET`).
- Model/provider API key(s) for the Eve agent runtime (`AI_GATEWAY_API_KEY`
  or `VERCEL_OIDC_TOKEN` via `vercel link`).
