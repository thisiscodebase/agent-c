# Customization

Concrete diff from upstream `vercel-labs/personal-agent-template`, organized the
way the upstream `CUSTOMIZATION.md` walkthrough is (rebrand → persona → tools →
connections → skills), plus the schema and UI work that has no upstream
equivalent.

## 1. Rebrand

- `shared/agent.ts`, `package.json` — renamed from the template's example
  persona to 🍊 Agent C.
- `agent/lib/base-instructions.ts` — rewritten system prompt: an internal
  lookup-and-synthesis assistant for CodeBase, not a personal assistant. States
  plainly what it's for (case studies, reports, cross-source lookup) and what it
  isn't (not a coding agent, not a replacement for Drive/HubSpot/Notion/Slack's
  own search).

## 2. Deleted

Removed rather than left dormant, to avoid anyone building on stale example
code:

- `agent/channels/sendblue.ts` (iMessage) — not a requirement.
- `agent/tools/weather.ts` — upstream's placeholder example tool.
- `agent/connections/linear.ts` — not a CodeBase data source.
- `agent/tools/github.ts` + GitHub Integrations registry entry — not a CodeBase
  lookup source (coding-agent/PR work is a separate future project).

## 3. Kept and repurposed

- `agent/skills/daily-summary/SKILL.md` — activity digest over live connectors
  (Drive recent, Slack, HubSpot, Platform) plus injected `active_focus`. Optional
  `create_artifact` (`type: "summary"`, `kind: "daily_summary"`). Shared tracked-
  folder artifact search from Phase 4 can tighten scoping later.

## 4. New tools (`agent/tools/`)

- `search_slack.ts` — live Slack Real-time Search (`assistant.search.context`)
  on the same Connect app as the Slack channel (`slack/agent-c`), per-user token.
- `search_drive.ts` / `list_recent_drive.ts` / `read_drive_file.ts` — temporary
  Drive API v3 REST tools (same Connect OAuth as Integrations). Hosted Drive MCP
  bypassed until Google’s data plane works.
- Phase 4 (not yet): `search_artifacts.ts`, `generate_report.ts`.

Live HubSpot / Notion / Tally lookup is folded into connection files
(`agent/connections/*`) rather than separate `search_*` tools — Eve discovers
MCP tools via `connection_search`. Drive uses custom tools (Slack-style) for now.

## 5. New connections (`agent/connections/`)

- ~~`drive.ts`~~ — removed temporarily; Drive chat uses REST tools above.
  Connect UID stays `drivemcp.googleapis.com/agent-c`.
  - `hubspot.ts` — HubSpot official MCP (`https://mcp.hubspot.com`), Connect
  app-scoped by default. Read/search tools allow-listed; writes blocked for v1.
- `notion.ts` — Notion hosted MCP (`https://mcp.notion.com/mcp`), Connect
  per-user OAuth (hosted Notion MCP does not support bearer tokens).
- `tally.ts` — Tally hosted MCP (`https://api.tally.so/mcp`), Connect per-user
  OAuth (API key also supported by Tally; we use OAuth).
- `asana.ts` — Asana hosted MCP V2 (`https://mcp.asana.com/v2/mcp`), Connect
  per-user OAuth (pre-registered MCP app; no DCR). Write tools blocked for v1.
- `platform.ts` — CodeBase Platform MCP (env bearer). **Read-only** tool
  allow-list for internal release; write tools omitted until re-enabled.
- Slack channel retained from upstream (`agent/channels/slack.ts`); search uses
  the **same** Connect app with expanded scopes via `search_slack.ts`.

Registry + Integrations UI: [`server/connectors.ts`](../server/connectors.ts),
UIDs in [`shared/connect.ts`](../shared/connect.ts).

## 6. Schema (`server/db/schema/`)

Phase 4 (not yet), in addition to what's carried over from the Postgres
migration:

- `artifacts`
- `artifact_sources` (designed `source_type`:
  `drive | hubspot | notion | slack`)
- `artifact_chunks` (requires the `pgvector` extension, already enabled)

Upstream's `user_memory` table is retained as-is for personal preferences; it is
deliberately _not_ extended or repurposed to hold case-study content.

## 7. UI

- Next.js App Router chat, settings (Profile + Integrations), command palette —
  shipped in Phases 0–2.
- Phase 4: case-study / artifact browser and review-before-publish UI.

## 8. Auth (`server/utils/auth.ts`)

Better Auth's email/password provider replaced with the Google provider,
domain-restricted (`hd` parameter) to CodeBase's Google Workspace domain. Slack
continues to use upstream's account-linking flow rather than becoming a second
login provider.

## Resolved decisions

- **Framework for `web`**: Next.js (`eve/next`, `withEve()`).
- **Slack search vs. Slack channel**: same Connect app (`slack/agent-c`), expanded
  scopes; search tool is separate code but not a second bot.
- **HubSpot connector mechanism**: HubSpot official first-party MCP
  (`mcp.hubspot.com`), not Composio or generic REST-only OAuth.
- **Drive**: temporary Drive API v3 REST tools (`search_drive`, etc.) via
  Connect OAuth — hosted Drive MCP bypassed until Google’s data plane works.
- **Notion**: added as a Phase 3 lookup source via hosted Notion MCP.
