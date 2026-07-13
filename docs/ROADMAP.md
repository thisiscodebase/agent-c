# Roadmap

Phased build plan, plus an honest scope/difficulty assessment of the two stretch
goals (collaborative threads, coding agent/PR features). Priority established at
project kickoff: ship web + Slack fast, evolve later — this ordering reflects
that.

## Phase 0 — Fork & rebrand

- Fork `personal-agent-template`.
- Resolve the framework decision for `web` (Nuxt vs. Next.js vs. TanStack Start)
  now, before other UI work compounds the cost of switching later.
- Rebrand (`shared/agent.ts`, `app/app.config.ts`, `package.json`).
- Delete Sendblue channel, `weather.ts`, Linear connection.
- Rewrite `daily-summary.md` as the activity-digest meta-feature rather than
  deleting it.
- Rewrite `agent/lib/base-instructions.ts` for the CodeBase persona.

## Phase 1 — Auth: Google Workspace

- Swap Better Auth's provider to Google, domain-restricted, on `web` only.
- Update login UI and auth middleware.
- Confirm Slack continues via upstream's account-linking flow rather than a
  second OAuth provider.

## Phase 2 — Persistence: Postgres

- Replace NuxtHub SQLite with Supabase (Postgres) + Drizzle.
- Enable `pgvector` ahead of Phase 4's schema work.
- Decide whether artifact visibility (draft/published, source-permission gating)
  is enforced via Supabase Row Level Security or kept application-level — see
  `ARCHITECTURE.md`.
- Do this before Phase 4, not after, to avoid a second migration.

## Phase 3 — Connectors

- Drive: official Google Drive MCP via Vercel Connect custom OAuth, per-user.
- HubSpot: official HubSpot MCP (`mcp.hubspot.com`), app-level by default.
- Notion: official Notion MCP (`mcp.notion.com/mcp`), per-user OAuth.
- Slack: same Connect app as the channel (`slack/agent-c`), expanded Real-time Search
  scopes; reuse upstream's channel wiring.

## Phase 4 — Artifact data model

- `artifacts`, `artifact_sources`, `artifact_chunks` tables (see
  `ARCHITECTURE.md`).
- `search_artifacts.ts` (hybrid keyword + semantic) and `generate_report.ts`
  (export to Drive/`.docx`/`.pdf`) tools.
- Case-study/artifact browser and review-before-publish UI.

## Phase 5 — Slack surface polish

- Finalize DM vs. `@mention` invocation pattern (config choice, not new code —
  both already supported upstream).

---

## Stretch goal assessment

### Collaborative threads

**Difficulty: moderate-to-hard. Architectural change, not a feature flag.**

Upstream's `threads` table and Eve's session/memory injection are both built
around single-user ownership — one thread, one `user_id`. Making a thread
genuinely multi-user (several people in one live session, seeing each other's
messages and tool calls stream in) requires:

- A `thread_participants` join table.
- Real-time/presence infrastructure Nuxt doesn't provide out of the box — this
  is a large part of why `background-agents` isn't built on Eve at all; it uses
  Cloudflare Durable Objects specifically to solve this problem.
- A resolved policy for whose permissions apply when a shared thread queries a
  per-user-scoped source like Drive — two participants may not have the same
  access.

Realistic estimate: multi-week effort, and it pulls in patterns closer to
`background-agents`' architecture than anything in `personal-agent-template`.

**Recommendation**: treat Phase 4's review/publish UI (shared artifacts with
implicit hand-off, not live co-editing) as the pragmatic substitute unless live
co-presence turns out to be a frequently-requested workflow in practice, not
just a hypothetical one.

### Coding agent / PR features

**Difficulty: hard. Integration project, not an extension of this one.**

This isn't "add a tool to the Eve agent" — it requires infrastructure this
template was never designed to provide:

- Sandboxed, safe arbitrary code execution (`background-agents` uses Modal for
  this).
- A GitHub App for correctly-attributed commits and PR authoring.
- An actual coding agent engine (`background-agents` uses OpenCode).

Bolting sandbox execution directly into the Eve agent process would both open a
security surface this project doesn't currently have and duplicate
infrastructure that already exists, well-built, in `background-agents`.

**Recommendation**: stand up `background-agents` (or equivalent) as a completely
separate deployment when this becomes a real requirement, and give the 🍊 Agent
C a tool that hands off to it — e.g. "open a PR updating the case-study
template" becomes a call to an external service, not native agent logic. Budget
as its own project with its own timeline; do not fold into this repo's roadmap
as a phase.
