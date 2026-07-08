# Progress

Working state of the `agent-c` → "CodeBase Agent" build, checked against the
original plan in [`docs/ROADMAP.md`](ROADMAP.md). Read that doc first for the
phase definitions and the stretch-goal writeups (collaborative threads,
coding agent/PR features) — this file only tracks status and gotchas, it
doesn't re-explain the plan.

## Status

**Chat works end-to-end** (real Google Workspace auth, real streamed AI
responses via Vercel AI Gateway, Postgres-backed thread persistence,
Next.js UI). **Phase 3 connectors are wired in code** (Drive / HubSpot /
Notion MCP connections + Slack search tool + Integrations registry). They
still need operator provisioning (`vercel connect create` / attach, GCP
OAuth client for Drive, HubSpot MCP Auth App, Notion OAuth, Slack search
scopes) before they work live — see [`docs/ENVIRONMENT.md`](ENVIRONMENT.md).

**Phases 4–5 — artifact data model and Slack surface polish — are not
started.** Synthesis into reviewable case studies still depends on Phase 4.

All work through Phase 3 code below is ready to commit once verified.

## Shipped

| Phase | What | Notes |
|---|---|---|
| 0 — Fork & rebrand | Done | `shared/agent.ts`, `AGENTS.md`, README rebranded; Sendblue/iMessage, phone-linking, Linear, `weather` tool all deleted. |
| — Framework | Nuxt → Next.js | Not an original roadmap phase, but the framework decision landed on Next.js and the full app was ported (App Router, `eve/next`'s `withEve()`). Old Nuxt app kept at `app-nuxt-legacy/` as a reference — delete once Task 13 (below) is done. |
| 1 — Auth | Done, verified live | Google Workspace OAuth (domain-restricted via `hd`), two-tier session check. Confirmed working with a real account. |
| 2 — Persistence | Done | Postgres + Drizzle (`server/db/schema/*.ts`), pgvector enabled ahead of Phase 4, local `supabase start` verified. |
| — Chat UI foundations | Done, verified live | Vue composables ported to React hooks (TanStack Query); Next.js UI (home, `/chat/[id]`, settings) on shadcn/AI Elements; message rendering split into reusable `components/chat/parts/*`; dismissable turn-error banner; Cmd+K command palette. Confirmed live end-to-end. |
| — Chat primitives | shadcn chat components | Adopted shadcn's June 2026 chat-components release: `MessageScroller`, `Message`+`Bubble`, `shimmer` CSS utility. |
| — UI primitives | Radix → Base UI | All 18 shadcn `components/ui/*` primitives migrated from `radix-ui` to `@base-ui/react`. `components/ai-elements/*` stays on Radix. |
| 3 — Connectors | Code done; provisioning pending | Drive MCP (`agent/connections/drive.ts`), HubSpot MCP (`hubspot.ts`), Notion MCP (`notion.ts`), Slack search tool (`agent/tools/search_slack.ts`) on same `slack/v` app. Integrations registry in `server/connectors.ts`. GitHub connector removed from product surface. |

## Remaining — original roadmap

### Phase 3 — Connectors (code done; ops remaining)

Operator steps before live verification:

1. Provision Connect connectors and update UIDs in `shared/connect.ts` if needed
2. GCP: enable Drive + Drive MCP APIs, OAuth client for Drive (Developer Preview)
3. HubSpot: MCP Auth App → Connect attach (app-scoped; fall back to user-scoped if needed)
4. Notion: Connect attach for `mcp.notion.com`
5. Slack: expand `slack/v` with Real-time Search scopes
6. Settings → Integrations Connect / Test; chat lookup smoke tests

**Verification checklist (after provisioning):**

- [ ] Settings → Integrations lists Drive, HubSpot, Notion, Slack search (no GitHub)
- [ ] Drive Connect → Test lists recent files; chat can `search_files` / read content
- [ ] HubSpot Connect/Test returns companies; chat CRM lookup works without inventing deals
- [ ] Notion Connect → Test / chat search respects the authorizing user’s pages
- [ ] Slack-linked user can run `search_slack` with expanded scopes
- [ ] `pnpm typecheck` clean (already verified in Phase 3 implementation)

### Phase 4 — Artifact data model (not started)

This is the core of the "Synthesis" half of the product and nothing for it
exists yet: no `artifacts`/`artifact_sources`/`artifact_chunks` tables (see
`ARCHITECTURE.md`'s "Data model: generic artifacts" section — `source_type`
includes `notion`), no `search_artifacts.ts` or `generate_report.ts` tools,
no case-study browser or review-before-publish UI. Blocks the daily/weekly
digest meta-feature too — `agent/skills/daily-summary.md` still needs the
fuller rework once this lands.

### Phase 5 — Slack surface polish (not started)

Channel wiring works (reused from upstream), but the DM-vs-`@mention`
invocation pattern still needs to be finalized as a config choice.

## Remaining — chat UI polish

- Quick-chat pill visual design (functional today via AI Elements
  `Suggestion`, just not art-directed)
- Attachment/file upload isn't wired into the composer (`PromptInput`
  supports it; not exercised yet)

## Housekeeping

- **Task 13**: once satisfied with a click-through, delete `app-nuxt-legacy/`
  and the now-unused `@iconify-json/*` devDependencies.

## Environment

- `AI_GATEWAY_API_KEY` or a `VERCEL_OIDC_TOKEN` (via `vercel link`) is
  required for the agent to respond at all — `agent/agent.ts`'s
  `anthropic/claude-sonnet-4.6` model string routes through Vercel AI
  Gateway, not a direct Anthropic key. Confirmed working locally via
  `vercel link`.
- Tailwind v4 under Turbopack needs `postcss.config.mjs` with
  `@tailwindcss/postcss` — this was missing (pre-dated this session) and
  produced a completely unstyled app; now fixed.
- See [`docs/ENVIRONMENT.md`](ENVIRONMENT.md) for connector provisioning
  (Drive MCP is Google Developer Preview; HubSpot/Notion/Slack search).

## Gotchas (non-obvious, worth not re-discovering)

- **Next.js 16's `proxy.ts` reads a `config` export, not `proxyConfig`**,
  despite some docs/skills claiming otherwise — verified directly against
  `node_modules/next/dist/build/analysis/get-page-static-info.js`.
- **`components.json` style must stay `radix-nova`, not `base-*`** —
  `components/ai-elements/reasoning.tsx` imports
  `@radix-ui/react-use-controllable-state` directly and Base UI has no
  public equivalent hook, so a whole-project `shadcn init --base base-ui`
  flip is a dead end here. Every other shadcn `components/ui/*` primitive
  has already been migrated to `@base-ui/react` individually (progressive
  mode, one component per commit); do the same for any new component
  rather than attempting the whole-project flip. See `.migration/*.md` for
  per-component notes, and `agent/skills/migrate-radix-to-base/` (installed
  via `pnpm dlx skills add shadcn/ui`) for the migration reference tables.
- **`eve/react`'s `useEveAgent` already handles resumable sessions, HITL, and
  authorization prompts natively** — don't hand-roll this (the old Vue app
  did, before the Next.js port). Read
  `node_modules/eve/docs/guides/frontend/overview.mdx` first; it documents
  the `key={chat.id}` remount pattern (required — `useChatSession`'s config
  is only read once per mount) and the authorization message-part shape.
- **Local dev auth bypass, if needed again**: better-auth ships a
  `testUtils` plugin (`node_modules/better-auth/dist/plugins/test-utils/`)
  for minting a signed session cookie without real OAuth. Run it as a
  **standalone script outside `app/`, never committed** — adding it as an
  app route (even `NODE_ENV`-gated) is an auth-bypass risk and was correctly
  blocked when tried.
- **Local Supabase can lose the port race** to another project's instance
  (`supabase_db_<other-project>` squatting 54321-54329). Check `docker ps`
  before assuming the port is free; never stop another project's instance
  without confirming with the user — it may have an active `next dev`
  depending on it.
- **A stale orphaned `react@19.2.6` in the pnpm store** can cause every Radix
  component to fail type-check with `IntrinsicAttributes` errors. Fix:
  `rm -rf node_modules && pnpm install`; check
  `find node_modules/.pnpm -maxdepth 1 -iname "react@*"` for duplicates.
- **This install's `CommandDialog` (`components/ui/command.tsx`) does not
  wrap its children in cmdk's `Command` root**, unlike the standard shadcn
  registry version. Any `CommandInput`/`CommandList` rendered directly inside
  `CommandDialog` crashes at runtime (`Cannot read properties of undefined
  (reading 'subscribe')`) — always nest an explicit `<Command>` between
  `CommandDialog` and its content.
- **Drive MCP is Google Developer Preview** — enable `drivemcp.googleapis.com`
  in the GCP project; tool names and availability may change.
- **HubSpot app-scoped Connect**: if Connect cannot mint an app token against
  HubSpot's PKCE MCP Auth App, set `authMode: "user"` on the HubSpot entry in
  `server/connectors.ts` and switch `hubspot.ts` to user-scoped `connect(...)`.
