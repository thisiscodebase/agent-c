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

The upstream template ships Nuxt for `web`. Nothing else in the architecture
is Nuxt-specific — the `agent/` service, the Drizzle schema, and Better
Auth's core logic are all framework-agnostic (Better Auth ships adapters for
both Nuxt and Next.js; Vercel Connect ships adapters for both Better Auth and
Auth.js). If the team has a stronger React preference, swapping `web` to
Next.js or TanStack Start is a frontend + thin server-route rewrite, not an
architecture change, and is cheaper to do now (Phase 0) than after
case-study UI has been built out on top of Nuxt. This repo's `web/`
implementation should note which framework was ultimately chosen and treat
the other two as the rejected alternatives, not as an open question left
unresolved.

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
is a genuine fit for the artifact visibility problem described under *Data
model* — draft-vs-published, and per-source-permission gating, can be
enforced as Postgres policies rather than purely in application code. Worth
deciding during implementation whether RLS is actually used for that gating
or whether it stays application-level for simplicity — either is workable,
but Supabase makes RLS available as a direct option in a way a plain
Postgres host wouldn't.

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
  slack), source_ref, source_url`. Provenance and audit trail: which
  documents, deals, or threads a given artifact was synthesized from. This
  is also the hook for a review gate — an artifact built from a
  Drive/HubSpot source that turns out to be access-restricted shouldn't
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

- **External sources (Drive, HubSpot, Slack)** — queried live via MCP
  connector tool calls against each service's own search API, not
  pre-indexed by us. Building and maintaining a Notion-Enterprise-Search-style
  indexing pipeline per external source is a large, ongoing engineering
  investment that isn't justified for v1.
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

| Source | Mechanism | Auth model | Notes |
|---|---|---|---|
| Slack (surface) | Native Vercel Connect Slack connector | App-level | Already solved upstream — receiving/replying to messages |
| Slack (search) | Same connector, used for search rather than receipt | Per-user preferred | Confirm whether the SDK needs a separate connection object |
| Google Drive | Vercel Connect generic OAuth connector | **Per-user** | No dedicated Drive connector yet. Per-user is required: Drive's fine-grained folder sharing is the actual access boundary, and a service-account/app-level credential would let the agent (and therefore anyone who can talk to it) bypass that boundary. See "Auth model for connectors" below. |
| HubSpot | Generic OAuth connector or third-party HubSpot MCP (e.g. Composio) | App-level (default) | No dedicated connector either. CRM visibility is typically uniform across a company; revisit as per-user if HubSpot access at CodeBase turns out to be team-restricted. |

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

Drive uses per-user because its permission model is the actual security
boundary for customer-confidential material. HubSpot defaults to app-level
because CRM access is typically uniform — but this is a per-connector
decision, not a global policy, and should be re-checked against how CodeBase
actually restricts each system.

## Removed surfaces / example scaffolding

- **Sendblue/iMessage channel** — not a requirement, removed entirely rather
  than left dormant.
- **`weather.ts` example tool** — removed; it was upstream's placeholder tool
  example.
- **Linear connection** — removed; not a CodeBase data source.

## Kept and repurposed: `daily-summary.md`

Upstream ships `daily-summary.md` as an example "meta-feature" skill — an
agent-native output that only works because the agent has combined context
across sources. Rather than deleting it as example scaffolding, it's kept
and repurposed as a case-study-relevant activity digest (new HubSpot deal
stages, Drive activity in tracked customer folders, Slack mentions of
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
