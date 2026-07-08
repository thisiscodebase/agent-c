# Customization

Concrete diff from upstream `vercel-labs/personal-agent-template`, organized
the way the upstream `CUSTOMIZATION.md` walkthrough is (rebrand → persona →
tools → connections → skills), plus the schema and UI work that has no
upstream equivalent.

## 1. Rebrand

- `shared/agent.ts`, `app/app.config.ts`, `package.json` — renamed from the
  template's example persona to CodeBase Agent.
- `agent/lib/base-instructions.ts` — rewritten system prompt: an internal
  lookup-and-synthesis assistant for CodeBase, not a personal assistant.
  Should state plainly what it's for (case studies, reports, cross-source
  lookup) and what it isn't (not a coding agent, not a replacement for
  Drive/HubSpot/Slack's own search).

## 2. Deleted

Removed rather than left dormant, to avoid anyone building on stale example
code:

- `agent/channels/sendblue.ts` (iMessage) — not a requirement.
- `agent/tools/weather.ts` — upstream's placeholder example tool.
- `agent/connections/linear.ts` — not a CodeBase data source.

## 3. Kept and repurposed

- `agent/skills/daily-summary.md` — kept, rewritten as the case-study-
  relevant activity digest described in `ARCHITECTURE.md`. This is the one
  piece of upstream example content judged good enough to build on directly
  rather than replace.

## 4. New tools (`agent/tools/`)

- `search_artifacts.ts` — hybrid (keyword + semantic) search over the
  `artifacts` store, with a `type` filter (`case_study`, `daily_summary`,
  `report`, `note`, ...) rather than a case-study-only search tool.
- `generate_report.ts` — synthesizes an artifact's `content_markdown` into
  an exportable file (Google Doc via Drive API, or `.docx`/`.pdf`/`.xlsx`
  via file-creation), a distinct action from saving/updating the artifact
  itself.
- `search_drive.ts`, `search_hubspot.ts` (or folded into the connection
  files directly, TBD during implementation) — live queries against each
  connector's native search, per `ARCHITECTURE.md`'s search section.

## 5. New connections (`agent/connections/`)

- `drive.ts` — Vercel Connect generic OAuth connector, per-user token
  subject.
- `hubspot.ts` — generic OAuth connector or a third-party HubSpot MCP,
  app-level token subject by default.
- Slack connection retained from upstream; confirm whether search usage
  needs a distinct connection object from the channel-receiving one.

## 6. Schema (`server/db/schema/`)

New, in addition to what's carried over from the Postgres migration:

- `artifacts`
- `artifact_sources`
- `artifact_chunks` (requires the `pgvector` extension, enabled on the
  Supabase project)

Upstream's `user_memory` table is retained as-is for personal preferences;
it is deliberately *not* extended or repurposed to hold case-study content.

## 7. UI (`app/`)

- `app/pages/case-studies/` — new. Browse, review, and publish artifacts.
  This is also where the governance step lives: an artifact synthesized from
  a Drive/HubSpot source doesn't auto-publish to the shared store without a
  review pass, since per-user Drive access controls what the agent can
  *read*, not what should become company-wide visible content once
  synthesized.
- `app/components/chat/tool/` — new components for `search_artifacts` and
  `generate_report` tool-call rendering, alongside whatever upstream tool UI
  components are kept.
- `app/pages/{chat,settings,login}.vue` (or React/TanStack equivalents,
  depending on the framework decision in `ARCHITECTURE.md`) — restyled for
  the CodeBase persona; login updated for Google OAuth.

## 8. Auth (`server/utils/auth.ts`)

Better Auth's email/password provider replaced with the Google provider,
domain-restricted (`hd` parameter) to CodeBase's Google Workspace domain.
Slack continues to use upstream's account-linking flow rather than becoming
a second login provider.

## Open decisions to close out during implementation

- **Framework for `web`**: Nuxt (upstream default) vs. Next.js vs. TanStack
  Start. See `ARCHITECTURE.md` — decide in Phase 0, before case-study UI is
  built, since the cost of switching only grows from here.
- **Slack search vs. Slack channel**: confirm in the Eve/Vercel Connect docs
  whether these need separate connection objects or can share one.
- **HubSpot connector mechanism**: generic OAuth connector vs. a third-party
  MCP server (e.g. Composio) — depends on how much of HubSpot's object model
  (deals, companies, custom properties) the generic connector exposes versus
  what a dedicated MCP server would.
