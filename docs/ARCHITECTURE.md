# Architecture

This document describes how the CodeBase Agent fork diverges from
[`vercel-labs/personal-agent-template`](https://github.com/vercel-labs/personal-agent-template),
and why. It assumes familiarity with the upstream `ARCHITECTURE.md` — this is
a delta document, not a replacement for it.

## Why this template

Four candidate starting points were evaluated: `eve-chat-template` (web-only,
no Slack), `eve-slack-agent-template` (Slack-only, no persistence or web UI),
`personal-agent-template` (web + Slack on one agent, identity linked across
both), and `ColeMurray/background-agents` (a non-Eve, Ramp-Inspect-style
coding agent with sandboxed execution and PR authoring).

`personal-agent-template` was chosen because it's the only option that
already solves "same agent, two surfaces, one identity" — which maps directly
onto the hard requirements (Google/Slack login, Slack invocation, simple web
UI). `background-agents` solves a genuinely different problem (safe code
execution and PR attribution) with a heavier, non-Eve architecture; it's
treated as a separate future service, not a merge candidate — see
[`ROADMAP.md`](ROADMAP.md).

We also evaluated buying rather than building — Notion AI's Enterprise
Search, Notion Agent, and Custom Agents now cover a meaningful chunk of this
requirement (permission-aware cross-source search, Slack-invokable agents,
cited report generation). The deciding factors against it: no HubSpot
connector in Notion's AI Connectors list, Notion agents only reliably write
back into Notion (no externally-shareable file artifacts), no durable
long-term memory primitive for Custom Agents, and no path to the future
coding-agent or collaborative-thread requirements. Worth periodically
re-checking as Notion's connector list and agent capabilities evolve.

## Service split

Unchanged from upstream: two Vercel services.

- **`web`** — Nuxt/Nitro app (or its Next.js/TanStack Start equivalent — see
  *Framework* below). Handles user-facing auth, the chat UI, settings, and
  the case-study/artifact browser. Talks to `eve` over an internal
  bearer-authed API.
- **`eve`** — the Eve agent runtime. Framework-agnostic TypeScript. Owns
  tools, connections (MCP), skills, and channel handling (Slack, and no
  longer iMessage/Sendblue — see *Removed surfaces*).

This split is preserved as-is: it's sound for a multi-user internal tool and
nothing in our requirements pushes toward collapsing it.

## Framework: web service

**Resolved: Next.js (App Router).** The upstream template ships Nuxt for
`web`; nothing else in the architecture was Nuxt-specific, so the swap was a
frontend + route-handler rewrite, not an architecture change. Confirmed via
`eve/next`'s own docs that its deploy topology (single Vercel project, `eve`
mounted behind the main app on the same origin via `withEve()`) matches
`eve/nuxt`'s — the existing two-service `vercel.json` (`experimentalServices.web`
+ `.eve`) carried over unchanged, just with `web.framework` switched from
`"nuxtjs"` to `"nextjs"`. TanStack Start was the rejected alternative; the
Next.js ecosystem's maturity (shadcn/ui, Vercel AI Elements for the chat
surface) was the deciding factor. Better Auth and Drizzle needed no
architectural change — both already had first-class Next.js support.

## Auth

Google Workspace OAuth (domain-restricted to CodeBase's workspace domain)
replaces the upstream template's email/password Better Auth config. This
lives entirely in the `web` service — `eve` never authenticates end users
directly; it only receives already-authenticated calls (from `web` via the
internal API, and from Slack via a Vercel Connect-verified webhook). Google
OAuth credentials are therefore only required on `web` — see
[`ENVIRONMENT.md`](ENVIRONMENT.md).

Slack identity continues to use the upstream template's account-linking flow
(a Slack user links their account to their web/Google identity) rather than
adding Slack as a second OAuth login provider — this was already solved
upstream and doesn't need duplicating.

## Persistence

NuxtHub SQLite is replaced with Postgres (Supabase) + `pgvector`, via
Drizzle — the same ORM the template already uses, so the schema *shape*
carries over conceptually; only the connection/driver and a few
extension-dependent columns change. This is done early (before the artifact
schema work) to avoid migrating data later, and because SQLite is expected
to bottleneck at whole-company (20-100 user) scale in a way it wouldn't for
the template's original single-user use case.

Supabase over a plain hosted Postgres option mainly for two reasons:
`pgvector` is supported natively, so no separate decision is needed for the
semantic-search work in the *Search* section below; and Row Level Security
was a candidate fit for the artifact visibility problem described under
*Data model* — draft-vs-published, and per-source-permission gating.

**Resolved: application-level enforcement, not RLS.** Drizzle connects via a
single service-role Postgres connection from the server layer (`server/db/client.ts`),
not per-user browser sessions with anon keys and propagated JWT claims — RLS
would need that plumbing added with no clear benefit, given the codebase
already does all per-user authorization in application code (e.g.
`requireSessionUserId`, which already scopes every query by `userId`). This
applies once the artifact tables land in Phase 4; no RLS policies are
planned.

**Resolved: pooled connection, via Supabase's Supavisor in transaction
mode**, not a direct connection. Vercel Functions are serverless and open
many short-lived connections per invocation, which would exhaust Postgres's
direct connection limit at 20-100-user scale. `DATABASE_URL` points at the
pooler (transaction mode, port 6543 on a hosted project); `DIRECT_URL` is the
unpooled connection, used only by `drizzle-kit` migrations. Transaction-mode
pooling doesn't support prepared statements, so the Postgres client is
configured with `{ prepare: false }`.

## Data model: generic artifacts, not case-study-specific tables

Case studies, daily/weekly summaries, notes, and ad hoc reports are all the
same underlying shape — formatted content, provenance, review status — so
they share one schema rather than one table per output type:

- **`artifacts`** — `id, type (case_study | daily_summary | report | note |
  ...), title, content_markdown, status (draft | review | published),
  author_id, metadata (jsonb), created_at, updated_at`. `metadata` carries
  type-specific structured fields (e.g. a case study's `customer`,
  `interventions[]`, `growth_metrics`) without requiring a dedicated table
  per type.
- **`artifact_sources`** — `artifact_id, source_type (drive | hubspot |
  notion | slack), source_ref, source_url`. Provenance and audit trail: which
  documents, deals, pages, or threads a given artifact was synthesized from.
  This is also the hook for a review gate — an artifact built from a
  Drive/HubSpot/Notion source that turns out to be access-restricted shouldn't
  auto-publish to the whole-company store just because the source was
  readable by the agent.
- **`artifact_chunks`** — `artifact_id, heading_path, content, embedding
  (vector), tsv (tsvector)`. Supports hybrid search — see *Search* below.
  Chunked on markdown headings rather than fixed-length windows, to keep
  chunks semantically coherent.

`content_markdown` is the canonical storage format regardless of output
type. Export to Google Docs, `.docx`, or `.pdf` is a conversion step applied
at export time, not a storage decision — the same artifact can be exported
multiple ways without the storage layer needing to know which one gets used.

## Search

Two different retrieval problems, handled differently:

- **External sources (Drive, HubSpot, Notion, Slack)** — queried live via MCP
  connector tool calls (or a thin Slack search tool) against each service's
  own search API, not pre-indexed by us. Building and maintaining a
  federated indexing pipeline per external source is a large, ongoing
  engineering investment that isn't justified for v1.
- **Our own artifact store** — hybrid search, combining:
  - full-text keyword search (Postgres `tsvector` + GIN index) for exact
    terms — customer names, product terms, anything where literal wording
    matters;
  - semantic search (`pgvector` cosine similarity over `artifact_chunks`)
    for conceptual queries where the answer's wording won't match the
    query's wording.

  Both are queried and results merged/re-ranked, rather than choosing one
  approach — mirroring how code-search tools handle the same exact-vs-semantic
  tradeoff. Re-embedding happens on save, since we control writes directly
  and don't have the sync-freshness problem a federated index would.

## Connectors

Credential lifecycle (OAuth, per-user grants, token refresh) is handled by
[Vercel Connect](CONNECT.md) — not by the MCP servers themselves. See that
doc for provisioning, pricing, and DIY comparison.

| Source | Mechanism | Auth model | Notes |
|---|---|---|---|
| Slack (surface) | Native Vercel Connect Slack connector (`slack/v`) | App-level | Receiving/replying to messages via `agent/channels/slack.ts` |
| Slack (search) | Same Connect app (`slack/v`), expanded scopes; `agent/tools/search_slack.ts` | **Per-user** | Slack Real-time Search API (`assistant.search.context`, granular `search:read.public`/`search:read.private`), not the legacy `search:read` scope |
| Google Drive | Official Drive MCP (`https://drivemcp.googleapis.com/mcp/v1`) via Vercel Connect custom OAuth | **Per-user** | Google Workspace Developer Preview. Per-user is required: Drive folder ACLs are the security boundary. See `agent/connections/drive.ts`. |
| HubSpot | Official HubSpot MCP (`https://mcp.hubspot.com`) via Vercel Connect | App-level (default) | Not a third-party router like Composio. CRM visibility is typically uniform; revisit as per-user if HubSpot access at CodeBase is team-restricted. See `agent/connections/hubspot.ts`. |
| Notion | Official Notion MCP (`https://mcp.notion.com/mcp`) via Vercel Connect | **Per-user** | Hosted Notion MCP is OAuth-only (no bearer/integration token on this endpoint). See `agent/connections/notion.ts`. |

### Auth model for connectors

Two options per connector, and the choice isn't uniform across sources:

- **Global/app-level** — one credential, same access for every user
  regardless of who's asking. Simple, but the agent becomes its own access
  control boundary — it can surface things a given employee wouldn't
  normally see, and audit logs attribute actions to the service account
  rather than the real person.
- **Per-user/delegated** — each person authorizes the connector themselves;
  the agent acts *as that user*, so the source system's own permissions
  apply for free, and actions are attributed to the real person.

Drive and Notion use per-user because their permission models are the actual
security boundary for confidential material. HubSpot defaults to app-level
because CRM access is typically uniform — but this is a per-connector
decision, not a global policy, and should be re-checked against how CodeBase
actually restricts each system.

## Removed surfaces / example scaffolding

- **Sendblue/iMessage channel** — not a requirement, removed entirely rather
  than left dormant. The phone-linking feature (`phone_links` table, profile
  phone field, link UI) existed solely to support this channel and was
  removed with it — no other consumer touched it.
- **`weather.ts` example tool** — removed; it was upstream's placeholder tool
  example.
- **Linear connection** — removed; not a CodeBase data source.

## Kept and repurposed: `daily-summary.md`

Upstream ships `daily-summary.md` as an example "meta-feature" skill — an
agent-native output that only works because the agent has combined context
across sources. Rather than deleting it as example scaffolding, it's kept
and repurposed as a case-study-relevant activity digest (new HubSpot deal
stages, Drive/Notion activity in tracked customer folders, Slack mentions of
tracked accounts, surfaced as one periodic summary). This doubles as the
clearest adoption lever for colleagues who haven't yet learned to ask the
agent things directly.

## Memory

Upstream's per-user long-term memory system (`save_memory`, category-based)
is retained for genuinely personal context — e.g. how a given person likes
reports formatted — but is explicitly *not* used for the case-study corpus
itself, which lives in the shared `artifacts` tables described above. Mixing
"my preferences" and "the company's case-study library" into one per-user
memory model was the wrong shape for a whole-company knowledge tool.
