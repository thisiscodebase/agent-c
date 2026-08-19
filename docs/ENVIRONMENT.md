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
- `ADMIN_EMAILS` — comma-separated allowlist of Google account emails that
  can open `/admin` and `/api/admin/*` (usage & cost dashboard). Matching is
  case-insensitive. When unset or empty, nobody has admin access. Example:
  `you@codebase.org,ops@codebase.org`. Costs are never exposed on public
  `/leaderboard` or `/u/[handle]` responses.

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

# Tally hosted MCP (OAuth)
vercel connect create https://api.tally.so/mcp --name agent-c
vercel connect attach <tally-uid> --yes

# Asana hosted MCP V2 — create an MCP app in Asana first (no DCR)
# https://app.asana.com/0/my-apps → Create new app → MCP app
vercel connect create https://mcp.asana.com/v2/mcp --name agent-c
vercel connect attach <asana-uid> --yes

# Retool hosted MCP (org-specific Streamable HTTP + OAuth)
vercel connect create https://thisiscodebase.retool.com/mcp --name agent-c
vercel connect attach <retool-uid> --yes

# Slack — reuse the existing channel app; expand scopes for Real-time Search
# (search:read.public, search:read.private, search:read.files, search:read.users)
# Channel credentials already use slack/agent-c in agent/channels/slack.ts

vercel env pull
```

Update UIDs in `shared/connect.ts` if `vercel connect list` returns different
values than the provisioned ones (`drivemcp.googleapis.com/agent-c`,
`mcp.hubspot.com/agent-c`, `mcp.notion.com/agent-c`, `api.tally.so/agent-c`,
`mcp.asana.com/bole-lantern`, `thisiscodebase.retool.com/agent-c`, `slack/agent-c`).

### CodeBase Platform MCP (`eve` + Platform)

Not Vercel Connect — shared app-scoped bearer between Agent C and CodeBase
Platform (`~/Developer/platform`).

On **Platform** (Next.js):

- `PLATFORM_MCP_TOKEN` — long random shared secret
- `PLATFORM_WORKSPACE_ID` — single production workspace UUID
- `PLATFORM_MCP_SERVICE_USER_ID` — optional audit attribution id
- `PLATFORM_MCP_WRITES_ENABLED` — leave unset/`0` for internal release (write
  tools are not registered). Set `1` only when re-enabling staff writes.
- `PLATFORM_MCP_PUBLIC_ORIGIN` — absolute origin for MCP permalinks **including
  the workspace subdomain**, e.g. `https://techscaler.<platform-host>` or
  local `http://techscaler.localhost:3001`. If unset, Platform derives
  `{workspaceSlug}.{NEXT_PUBLIC_ROOT_DOMAIN}`.

On **Agent C Eve runtime**:

- `PLATFORM_MCP_URL` — e.g. `https://<platform-host>/api/mcp` or
  `http://localhost:3001/api/mcp` for local (Platform on :3001 when Agent C
  occupies :3000)
- `PLATFORM_MCP_TOKEN` — same value as Platform

Connection file: `agent/connections/platform.ts` (read-only tool allow-list).
Integrations UI shows status from env (no OAuth Connect/Revoke).

### Companies House (`eve` + `web`)

Not Vercel Connect — shared app-scoped API key against the
[Companies House Public Data API](https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference)
(HTTP Basic; key as username). Register an API Key application at the
[Developer Hub](https://developer.company-information.service.gov.uk/).

On **Eve** (tools) and **web** (Settings → Integrations status/test):

- `COMPANIES_HOUSE_API_KEY` — public-data API key

Rate limit: 600 requests / 5 minutes per key. Chat uses four REST tools
(`search_companies_house`, `get_company_profile`, `get_company_officers`,
`list_company_filings`) — no hosted MCP, no per-user OAuth.

### Drive (GCP)

Drive MCP requires a Google Cloud project with:

- APIs: `drive.googleapis.com`, `drivemcp.googleapis.com`
- OAuth consent (Internal for Workspace) and a Web application client
- Redirect URI matching Vercel Connect's callback for the custom OAuth connector
- Scopes: at least `https://www.googleapis.com/auth/drive.readonly`

Drive MCP is currently a **Google Workspace Developer Preview**. Chat
temporarily uses Drive API v3 REST tools (`search_drive`, etc.) with the same
Connect grant — Connect UID stays `drivemcp.googleapis.com/agent-c`. Enable
`drive.googleapis.com` (required for REST); `drivemcp.googleapis.com` can stay
enabled for a future MCP re-enable.

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

### Tally

Hosted Tally MCP at `https://api.tally.so/mcp` supports OAuth (recommended)
or API key. Connect brokers per-user OAuth. See
[Tally MCP docs](https://developers.tally.so/api-reference/mcp).

### Asana

Hosted Asana MCP V2 at `https://mcp.asana.com/v2/mcp` uses OAuth only and
**does not support dynamic client registration**. Create an MCP app in the
[Asana developer console](https://app.asana.com/0/my-apps):

1. Create new app → select **MCP app**
2. Under OAuth, add the redirect URI Connect prints during
   `vercel connect create` (or the Connect callback shown in the dashboard)
3. Under **Manage distribution**, allow your workspace(s) (or “Any workspace”)
4. Copy Client ID + Client secret into the Connect create flow
5. Do **not** request custom scopes — MCP apps use `default` / omit scopes

MCP tokens only work with the Asana MCP server (not the standard Asana REST
API). Access is per authorizing user. See
[Integrating with Asana's MCP Server](https://developers.asana.com/docs/integrating-with-asanas-mcp-server).

### Retool

Hosted Retool MCP at `https://thisiscodebase.retool.com/mcp` uses Streamable
HTTP + OAuth 2.0. Connect brokers per-user consent. Request `mcp:read` and
`mcp:write` (`mcp:write` is required for `retool_execute_resource_ts`). Do
not request `mcp:admin` by default. Mutation / app-building tools are blocked
in `agent/connections/retool.ts` until the integration is confirmed. See
[Retool MCP](https://docs.retool.com/org-users/guides/mcp).

### Slack search

Same Connect app as the Slack channel (`slack/agent-c`). Expand the app's user
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

## Added — Vercel Flags (model routing)

Flags control which agent tier is active and which Gateway model each tier
uses. Definitions live in [`flags.ts`](../flags.ts); catalog defaults and
privacy helpers in [`shared/models.ts`](../shared/models.ts).

On **web** (and anywhere Flags SDK evaluates):

- `FLAGS_SECRET` — required by the Flags SDK (32 random bytes, base64url).
  Generate with
  `node -e "console.log(crypto.randomBytes(32).toString('base64url'))"`.
  Use a distinct value per environment.

Discovery for Flags Explorer: `GET /.well-known/vercel/flags`.

Defaults when Flags are unset or evaluation fails:

| Flag | Default |
|------|---------|
| `agent-tier` | `chat` |
| `agent-nano-model` | `openai/gpt-5.4-nano` |
| `agent-chat-model` | `openai/gpt-5.6-luna` |
| `agent-premium-model` | `anthropic/claude-sonnet-5` |
| `agent-extreme-model` | `openai/gpt-5.6-sol` |

Premium / chat / extreme / nano model flags accept **any** AI Gateway
`provider/model` string. Catalog lists in code are Explorer shortcuts only.
Selecting an `xai/…` model disables per-request ZDR automatically (keeps no
prompt training). Chat / premium / extreme agent calls use reasoning effort
`high`.
