# Vercel Connect

Why CodeBase Agent uses [Vercel Connect](https://vercel.com/docs/connect),
what it does versus MCP servers, how to provision it for demos, what a DIY
replacement would entail, and realistic pricing at CodeBase scale.

**Decision (2026):** use Connect for demos and early production. Revisit DIY
only if compliance, platform, or pricing drivers change materially.

Related docs:

- [Environment](ENVIRONMENT.md) — provisioning commands and provider setup
- [Architecture](ARCHITECTURE.md) — connector auth model per source
- [Progress](PROGRESS.md) — Phase 3 status and verification checklist

---

## MCP servers vs Connect — two different layers

Pointing the agent at an MCP URL and using Vercel Connect solve **different**
problems.

```
User question
  → Eve calls MCP tool (e.g. notion-search)
    → HTTP to https://mcp.notion.com/mcp     ← MCP server (provider-hosted)
      → Authorization: Bearer <token>        ← Connect (or DIY) provides this
```

| Layer | What it is | Examples in this repo |
|---|---|---|
| **MCP server** | Remote tool host — schemas, search/read/write APIs | `drivemcp.googleapis.com`, `mcp.hubspot.com`, `mcp.notion.com` |
| **Connect** | OAuth + token vault + refresh + per-user grants | `connect(DRIVE_CONNECTOR)`, Settings → Integrations, `connectSlackCredentials` |

MCP URLs tell the agent **where** to call. Connect tells the agent **how to
authenticate** safely for each user (or once for the whole app).

Without something like Connect (or a DIY equivalent), you still need:

- Browser OAuth consent per user (Drive, Notion, Slack search)
- Encrypted storage of access + refresh tokens
- Refresh before expiry (HubSpot refresh tokens are single-use)
- Revocation and “connected?” status for the Integrations UI
- In-chat “Sign in →” flows that resume the agent turn after OAuth

---

## What Connect does in CodeBase Agent

| Capability | Where it lives |
|---|---|
| Per-user OAuth | Drive, Notion, Slack search (`server/utils/connect.ts`, Integrations UI) |
| App-scoped shared token | HubSpot default (`authMode: "app"` in `server/connectors.ts`) |
| Eve connection auth | `agent/connections/*.ts` — `auth: connect(...)` |
| Inline tool auth | `agent/tools/search_slack.ts` — `ctx.getToken(connect(...))` |
| Slack bot + webhooks | `agent/channels/slack.ts` — `connectSlackCredentials("slack/v")` |
| In-chat authorization UI | `components/chat/parts/authorization-part.tsx` |
| Connector registry | `server/connectors.ts`, UIDs in `shared/connect.ts` |

Connect does **not** host MCP servers. Google, HubSpot, and Notion host
those. Connect brokers credentials so Eve never sees long-lived secrets in
env vars or model context.

---

## Provisioning for demos (Connect path)

### Prerequisites

```bash
vercel link
vercel env pull    # VERCEL_OIDC_TOKEN for local Connect SDK auth
pnpm dev
```

You also need normal app env (auth, database, `AI_GATEWAY_API_KEY` or OIDC).
See [Environment](ENVIRONMENT.md).

### Create and attach connectors

```bash
# Drive (GCP OAuth client required — see ENVIRONMENT.md)
vercel connect create https://drivemcp.googleapis.com/mcp/v1 --name codebase-agent
vercel connect attach <drive-uid> --yes

# HubSpot (MCP Auth App in HubSpot first)
vercel connect create mcp.hubspot.com --name codebase-agent
vercel connect attach <hubspot-uid> --yes

# Notion
vercel connect create mcp.notion.com --name codebase-agent
vercel connect attach <notion-uid> --yes

# Slack — reuse existing slack/v; expand search scopes in dashboard
vercel connect list
vercel env pull
```

Update [`shared/connect.ts`](../shared/connect.ts) if UIDs differ from
placeholders.

### Demo user flow

1. Sign in with Google Workspace (web auth — separate from Connect).
2. **Settings → Integrations** → Connect Drive / Notion / Slack search.
3. **Test** each connector.
4. Chat: ask for Drive/Notion/HubSpot/Slack lookup — OAuth challenge appears
   in chat if not pre-connected.
5. **Slack channel:** link account via link code (same Integrations page);
   bot uses `slack/v` independently of search OAuth.

Official references:

- [Vercel Connect overview](https://vercel.com/docs/connect)
- [Connect quickstart](https://vercel.com/docs/connect/quickstart)
- [Google Drive MCP](https://developers.google.com/workspace/drive/api/guides/configure-mcp-server)
- [HubSpot MCP](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server)
- [Notion MCP](https://developers.notion.com/guides/mcp/get-started-with-mcp)

---

## Pricing at CodeBase scale

Connect bills **per token request** — each `getToken` / `getTokenResponse`
call to the Connect API (not per user, not per connector).

Published pricing ([Connect pricing](https://vercel.com/docs/connect)):

| Plan | Allowance | Overage |
|---|---|---|
| Hobby | 5,000 requests / month included | — |
| Pro / Enterprise | — | ~$3 per 10,000 requests |

Eve caches tokens **per workflow step**, so multiple tool calls in the same
step for the same provider do not each hit Connect.

### Rough model for CodeBase (~100 max users, ~20 heavy daily)

**Assumptions**

- **Heavy (20):** 8–15 agent sessions/day, 3–5 connector-backed turns per
  session, 1–2 providers per turn.
- **Light (~80):** occasional connector use.
- Integrations page loads trigger status probes (~4 per visit).
- Eve step-level caching reduces duplicate token mints.

| Monthly token requests (estimate) | Connect cost (Pro) |
|---|---|
| &lt; 5,000 | $0 (within Hobby allowance; confirm plan) |
| 10,000 | ~$3 |
| 30,000 | ~$9 |
| 50,000 | ~$15 |

**Realistic range for demo + early internal use: ~$5–15/month on Pro**, often
less. Annual run-rate **~$60–180** unless usage is much heavier than
assumed (deep multi-connector research loops, constant Integrations testing).

Connect cost is usually **negligible vs engineering time** to replace it at
this scale.

### Ways to reduce token volume (without replacing Connect)

- Avoid hammering **Test** on Integrations in production.
- Cache connector status client-side between navigations (optional UI tweak).
- HubSpot as a single env token (loses per-user CRM attribution) — small
  savings only.

---

## DIY replacement — what “the same” requires

If Connect were removed, MCP URLs in `agent/connections/*.ts` would stay the
same. You would replace `connect(...)` with custom Eve auth providers or
`auth: { getToken, startAuthorization, completeAuthorization }` backed by your
own token store.

Eve supports this natively — see
[`node_modules/eve/docs/connections/overview.mdx`](../node_modules/eve/docs/connections/overview.mdx)
(“Interactive OAuth” without Vercel Connect).

### Build inventory (full parity)

| # | Component | Effort (experienced dev) | Notes |
|---|---|---|---|
| 1 | **Token store** | 2–3 days | Postgres `connector_grants`; encrypt access/refresh tokens; per-user + app-level rows |
| 2 | **OAuth 2.0 + PKCE core** | 3–5 days | Start URL, callback, state, code exchange, CSRF |
| 3 | **Per-provider config** | 4–8 days | Drive (GCP), Notion (PKCE), HubSpot (MCP Auth App), Slack (user scopes) |
| 4 | **Replace `server/utils/connect.ts`** | 2–3 days | probe, connect, mint, revoke for Integrations API |
| 5 | **Eve auth adapters** | 2–3 days | Swap `connect()` on connections + `search_slack.ts` |
| 6 | **In-chat + Settings callbacks** | 1–2 days | Eve resume URLs + `?connected=` return paths |
| 7 | **Slack bot without Connect** | 3–7 days | Bot token, signing secret, webhook verification — hardest piece |
| 8 | **Ops, security, tests** | 3–5 days+ | Rotation, revoke, provider churn, incident response |

**Totals**

- **MCP OAuth only** (Drive, Notion, HubSpot, Slack search): ~**2–3 weeks**
  for a solid v1.
- **+ Slack channel parity**: +**3–7 days**.
- **Ongoing**: provider API/OAuth changes, security reviews, on-call for
  broken grants.

A scrappy v1 in ~10–12 dev-days is possible with rough edges; true parity
with current Integrations + in-chat UX is closer to **3–4 weeks**.

### DIY schema sketch (illustrative)

```sql
-- illustrative only — not implemented
create table connector_grants (
  id uuid primary key,
  user_id text,              -- null for app-scoped (HubSpot)
  provider text not null,    -- drive | hubspot | notion | slack
  access_token_enc text not null,
  refresh_token_enc text,
  expires_at timestamptz,
  scopes text[],
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, provider)
);
```

Plus application-level encryption key management and refresh logic (especially
HubSpot single-use refresh tokens).

### Parity tiers

| Tier | Scope | Tradeoff |
|---|---|---|
| **Minimal DIY** | HubSpot env token only; skip per-user Drive/Notion | Not equivalent — breaks Drive ACLs and Notion OAuth |
| **Hybrid** | DIY Drive + Notion; **keep Connect for Slack** (`slack/v`) | ~1.5–2 weeks; avoids bot/webhook pain |
| **Full DIY** | Everything including Slack channel | ~3–4 weeks; only worth it for compliance or platform exit |

---

## Comparison summary

| | Vercel Connect (current) | Full DIY replacement |
|---|---|---|
| **Upfront build** | Done (Phase 3) | ~2–4 engineer-weeks |
| **Run cost @ 20–100 users** | ~$5–15/mo | $0 Connect fees + maintenance |
| **Per-user Drive/Notion** | Built-in | Custom OAuth + DB |
| **Slack bot + search** | One Connect app (`slack/v`) | Bot credentials DIY is painful |
| **Security burden** | Vercel-operated token vault | You encrypt, rotate, audit |
| **Eve integration** | `connect()` first-class | Custom `auth` providers |
| **Worth it at CodeBase scale?** | **Yes** for demo + early prod | Only with non-cost drivers |

### When to revisit DIY

- Compliance requires all third-party tokens in your Postgres with your KMS.
- You move off Vercel and Connect becomes awkward to operate.
- Connect pricing or limits grow materially with scale (hundreds of heavy
  users, very high connector churn).
- Strong platform lock-in concerns outweigh ~$100/year in fees.

### When Connect is the right call (now)

- Demo and internal rollout with **~20 heavy / ~100 max** users.
- Per-user Drive and Notion OAuth without building token infrastructure.
- Slack channel already integrated via `connectSlackCredentials`.
- Integrations UI and in-chat OAuth already wired.

---

## Per-connector notes

| Source | MCP / API endpoint | Connect role | DIY shortcut? |
|---|---|---|---|
| **Drive** | `https://drivemcp.googleapis.com/mcp/v1` | Per-user GCP OAuth | No — per-user required for ACLs |
| **HubSpot** | `https://mcp.hubspot.com` | App-scoped default | Possible: single `HUBSPOT_TOKEN` in env |
| **Notion** | `https://mcp.notion.com/mcp` | Per-user OAuth only | No — hosted MCP rejects bearer/integration tokens |
| **Slack search** | `assistant.search.context` API | Per-user token on `slack/v` | Possible but duplicates Slack app work |
| **Slack channel** | Events API (not MCP) | Bot token + webhook verify | Env vars + manual signature verification |

---

## Code map (Connect touchpoints)

```
shared/connect.ts              Connector UIDs
server/connectors.ts           Integrations registry + test probes
server/utils/connect.ts        getTokenResponse, startAuthorization, revoke
app/api/integrations/*       Connect / Test / Revoke API
agent/connections/drive.ts   MCP + connect(DRIVE_CONNECTOR)
agent/connections/hubspot.ts MCP + connect({ principalType: "app" })
agent/connections/notion.ts  MCP + connect(NOTION_CONNECTOR)
agent/tools/search_slack.ts  ctx.getToken(connect(SLACK_CONNECTOR))
agent/channels/slack.ts      connectSlackCredentials("slack/v")
components/chat/parts/authorization-part.tsx   In-chat OAuth link
```

---

## Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-07 | Use Connect for demos and Phase 3 connectors | MCP URLs still required; Connect cost ~$5–15/mo at expected scale vs weeks to DIY; Slack bot already on Connect |
