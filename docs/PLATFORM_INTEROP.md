# Agent C ↔ Platform MCP interop + Connect (production)

Guide for enabling CodeBase Platform MCP for Agent C, and provisioning the
other connectors (Drive, HubSpot, Notion, Tally, Slack) via Vercel Connect /
OIDC in production.

Related: [Environment](ENVIRONMENT.md), [Connect](CONNECT.md).

---

## 1. Architecture at a glance

| Integration | Auth model | Who hosts tools |
| ----------- | ---------- | --------------- |
| **Platform MCP** | Shared bearer (`PLATFORM_MCP_TOKEN`) — **not** Connect | CodeBase Platform (`/api/mcp`) |
| **Drive / HubSpot / Notion / Tally** | Vercel Connect OAuth (per-user or app-scoped) | Provider MCP URLs |
| **Slack search + Slack channel** | Connect app `slack/agent-c` | Slack APIs |

Platform is app-scoped and read-only for internal release. Connectors that use
Connect never put long-lived provider tokens in `.env` once attached —
Connect + OIDC mint short-lived credentials at runtime.

---

## 2. Platform MCP — env vars

### On CodeBase Platform (Next.js)

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `PLATFORM_MCP_TOKEN` | **Yes** | Long random shared secret. Must match Agent C. |
| `PLATFORM_WORKSPACE_ID` | **Yes** | Single workspace UUID (e.g. Techscaler). Not a tool arg. |
| `PLATFORM_MCP_PUBLIC_ORIGIN` | **Strongly recommended** | Absolute origin for permalinks **including workspace subdomain**, e.g. `https://techscaler.<platform-host>`. Local: `http://techscaler.localhost:3001`. |
| `PLATFORM_MCP_SERVICE_USER_ID` | No | Audit attribution label/id (default `mcp-service`). |
| `PLATFORM_MCP_WRITES_ENABLED` | No | Leave unset/`0` for internal release. Write tools are not registered unless `1`/`true`. |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Fallback | Used with workspace slug if `PLATFORM_MCP_PUBLIC_ORIGIN` is unset. |

Also ensure Platform’s normal app env is set (`NEXT_PUBLIC_SUPABASE_URL`,
service role, etc.) so MCP tools can query data.

**Permalink tip:** Without `PLATFORM_MCP_PUBLIC_ORIGIN` (or a derivable root
domain + workspace slug), tools omit `url` fields and the agent must not invent
links.

### On Agent C — Eve runtime (`eve`)

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `PLATFORM_MCP_URL` | **Yes** | Full MCP endpoint, e.g. `https://<platform-host>/api/mcp`. Local: `http://localhost:3001/api/mcp` if Platform runs on `:3001`. |
| `PLATFORM_MCP_TOKEN` | **Yes** | Same value as Platform. |

Connection file: `agent/connections/platform.ts` (read-only allow-list).

### On Agent C — web (optional for Platform)

No Platform-specific web env is required for MCP calls (Eve calls Platform
directly). Web still needs Connect/OIDC for the other connectors’ Integrations
UI (see below).

### Local smoke checklist

1. Platform: set token, workspace id, public origin; `pnpm next dev -p 3001`.
2. Agent C Eve: set `PLATFORM_MCP_URL` + matching token; restart `pnpm dev`.
3. Settings → Integrations → Platform should show configured (env mode).
4. Chat: ask for companies / sessions; answers should cite absolute `url`
   permalinks from tool output.

### Production checklist (Platform ↔ Agent C)

1. Generate a long random token; set the **same** value on Platform and Agent C Eve.
2. Set `PLATFORM_WORKSPACE_ID` to the production workspace UUID on Platform.
3. Set `PLATFORM_MCP_PUBLIC_ORIGIN` to the real workspace subdomain origin
   staff use in the browser.
4. Set `PLATFORM_MCP_URL` on Eve to `https://<production-platform-host>/api/mcp`.
5. Keep `PLATFORM_MCP_WRITES_ENABLED` off until writes are intentionally enabled
   on both sides.
6. Apply Agent C’s `supabase/migrations/20260713130000_thread_feedback.sql` if
   using thread Highlight feedback in production.

---

## 3. Vercel OIDC + Connect for other MCP servers (production)

Connect needs a linked Vercel project and OIDC so `@vercel/connect` can mint
tokens. This is **separate** from Platform’s bearer token.

### A. Link and pull env (local + CI)

```bash
cd ~/Developer/agent-c
vercel link --scope thisiscodebase   # or your team
vercel env pull .env.local --scope thisiscodebase
```

`vercel env pull` refreshes `VERCEL_OIDC_TOKEN` (and other project env). Local
Connect SDK auth depends on a fresh OIDC token — pull again if Connect calls
start failing with auth errors.

### B. Production / Preview on Vercel

1. Deploy Agent C to the same Vercel team/project you linked.
2. Vercel injects OIDC for the deployment automatically when the project is
   Connect-enabled — you generally do **not** paste a long-lived
   `VERCEL_OIDC_TOKEN` into Production env by hand.
3. Ensure Production (and Preview if needed) have the rest of app env:
   - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_WORKSPACE_DOMAIN`, Better Auth secrets
   - DB: `DATABASE_URL` (pooled), `DIRECT_URL` if you migrate from CI
   - AI: paid **AI Gateway** credits / `AI_GATEWAY_API_KEY` as required by your model routing (hosting Pro ≠ free Gateway tier)
   - Eve: `INTERNAL_API_SECRET`, Platform MCP vars above
4. After creating Connectors, run `vercel env pull` locally and confirm UIDs in
   `shared/connect.ts` match `vercel connect list`.

### C. Create and attach connectors

From the linked project:

```bash
# Drive — GCP OAuth client + Drive MCP APIs enabled first (see ENVIRONMENT.md)
vercel connect create https://drivemcp.googleapis.com/mcp/v1 --name codebase-agent
vercel connect attach <drive-uid> --yes

# HubSpot — MCP Auth App in HubSpot first
vercel connect create mcp.hubspot.com --name codebase-agent
vercel connect attach <hubspot-uid> --yes

# Notion
vercel connect create mcp.notion.com --name codebase-agent
vercel connect attach <notion-uid> --yes

# Tally
vercel connect create https://api.tally.so/mcp --name agent-c
vercel connect attach <tally-uid> --yes

# Slack — reuse channel app; expand Real-time Search scopes in the Slack app
# search:read.public, search:read.private, search:read.files, search:read.users
vercel connect list
```

Update placeholders in `shared/connect.ts` if list returns different UIDs.

### D. Per-connector operator steps

| Connector | Auth mode | Extra setup |
| --------- | --------- | ----------- |
| **Drive** | Per-user Connect | GCP: enable `drive.googleapis.com` + `drivemcp.googleapis.com`; OAuth client + Connect redirect; Workspace internal consent |
| **HubSpot** | App-scoped (default) | HubSpot → Development → MCP Auth Apps; on first connect approve contacts/companies/deals |
| **Notion** | Per-user OAuth | Users connect in Settings → Integrations; no Notion bearer on hosted MCP |
| **Tally** | Per-user OAuth | Users connect in Integrations |
| **Slack search** | Same `slack/agent-c` Connect app as channel | Expand search scopes; users may need Slack link in Settings |

### E. Verify in production

1. Open production Agent C → Settings → Integrations.
2. Connect / Test each connector (Drive, HubSpot, Notion, Tally, Slack).
3. Chat smoke: Drive file search, HubSpot company, Notion page, Tally form,
   Slack search, Platform company list.
4. If Connect fails only locally: re-run `vercel env pull`. If only in prod:
   confirm project link, Connect attachments, and that the deployment team
   matches the Connect scope.

---

## 4. What is *not* Connect

- **Platform MCP** — env bearer only; no `vercel connect create` for Platform.
- **AI Gateway billing** — top up AI credits on the Vercel team (or set a
  team-scoped `AI_GATEWAY_API_KEY`). Free-tier rate limits are unrelated to
  Connect OIDC.

---

## 5. Quick env matrix

| Concern | Platform | Agent C Eve | Agent C web |
| ------- | -------- | ----------- | ----------- |
| `PLATFORM_MCP_TOKEN` | ✓ | ✓ (same) | — |
| `PLATFORM_WORKSPACE_ID` | ✓ | — | — |
| `PLATFORM_MCP_PUBLIC_ORIGIN` | ✓ | — | — |
| `PLATFORM_MCP_URL` | — | ✓ | — |
| `PLATFORM_MCP_WRITES_ENABLED` | optional (off) | — | — |
| Connect / OIDC | — | ✓ (runtime) | ✓ (Integrations UI + `vercel env pull` locally) |
| Drive/HubSpot/Notion/Tally/Slack | — | via Connect UIDs | Connect create/attach + user OAuth where per-user |
