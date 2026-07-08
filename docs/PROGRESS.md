# Progress

Working state of the `agent-c` → "CodeBase Agent" build, checked against the
original plan in [`docs/ROADMAP.md`](ROADMAP.md). Read that doc first for the
phase definitions and the stretch-goal writeups (collaborative threads,
coding agent/PR features) — this file only tracks status and gotchas, it
doesn't re-explain the plan.

## Status

**Chat works end-to-end** (real Google Workspace auth, real streamed AI
responses via Vercel AI Gateway, Postgres-backed thread persistence,
Next.js UI). That covers Phases 0-2 of the roadmap plus the Nuxt→Next.js
framework migration. **Phases 3-5 — connectors beyond GitHub, the
case-study/artifact data model, Slack polish — are not started.** The
current app is a working generic chat shell; the product-specific pieces
that make it "CodeBase Agent" per [`README.md`](../README.md) (Drive/HubSpot
lookup, synthesis into reviewable case studies) don't exist yet.

All work through the UI-polish pass below is committed.

## Shipped

| Phase | What | Notes |
|---|---|---|
| 0 — Fork & rebrand | Done | `shared/agent.ts`, `AGENTS.md`, README rebranded; Sendblue/iMessage, phone-linking, Linear, `weather` tool all deleted. |
| — Framework | Nuxt → Next.js | Not an original roadmap phase, but the framework decision landed on Next.js and the full app was ported (App Router, `eve/next`'s `withEve()`). Old Nuxt app kept at `app-nuxt-legacy/` as a reference — delete once Task 13 (below) is done. |
| 1 — Auth | Done, verified live | Google Workspace OAuth (domain-restricted via `hd`), two-tier session check. Confirmed working with a real account. |
| 2 — Persistence | Done | Postgres + Drizzle (`server/db/schema/*.ts`), pgvector enabled ahead of Phase 4, local `supabase start` verified. |
| — Chat UI foundations | Done, verified live | Vue composables ported to React hooks (TanStack Query); Next.js UI (home, `/chat/[id]`, settings) on shadcn/AI Elements; message rendering split into reusable `components/chat/parts/*` (text via Streamdown markdown, reasoning collapse, authorization, dynamic-tool incl. a specialized `save_memory` approve/reject card); dismissable turn-error banner; Cmd+K command palette (new chat, settings, jump to any thread). Confirmed live end-to-end: new chat → streamed markdown response → thread persists → reload resumes. |

## Remaining — original roadmap

This is the actual gap between "chat works" and the product described in
`README.md`.

### Phase 3 — Connectors (not started)

`agent/connections/` is empty. `server/connectors.ts` only registers
**GitHub** — added in an earlier commit (`#8`), predates the CodeBase
rebrand, and isn't part of the original Drive/HubSpot/Slack scope in
`README.md`/`ROADMAP.md`. Decide whether to keep it as a bonus connector or
drop it for scope clarity.

Needed: a Drive connector (Vercel Connect generic OAuth, per-user) and a
HubSpot connector (generic OAuth or third-party MCP). Slack's connection
object question (search vs. channel) also still needs resolving, though the
Slack *channel* itself (DM/`@mention` invocation) already works via
`agent/channels/slack.ts`, reused from upstream.

### Phase 4 — Artifact data model (not started)

This is the core of the "Synthesis" half of the product and nothing for it
exists yet: no `artifacts`/`artifact_sources`/`artifact_chunks` tables (see
`ARCHITECTURE.md`'s "Data model: generic artifacts" section for the designed
shape — one generic schema across case studies/summaries/reports, not a
table per type), no `search_artifacts.ts` (hybrid keyword + semantic) or
`generate_report.ts` (export to Drive/`.docx`/`.pdf`) tools, no case-study
browser or review-before-publish UI. Blocks the daily/weekly digest
meta-feature too — `agent/skills/daily-summary.md` was de-Linear'd in Phase 0
but explicitly needs the fuller rework once this lands.

### Phase 5 — Slack surface polish (not started)

Channel wiring works (reused from upstream), but the DM-vs-`@mention`
invocation pattern still needs to be finalized as a config choice.

## Remaining — chat UI polish

The chat shell's foundations (markdown, reasoning, tool-call, memory-approval,
error, and command-palette patterns) are done and are the reusable base for
future feature UI. Smaller cosmetic items still open, lower priority:

- Quick-chat pill visual design (functional today via AI Elements
  `Suggestion`, just not art-directed)
- Attachment/file upload isn't wired into the composer (`PromptInput`
  supports it; not exercised yet)

## Housekeeping

- **Task 13**: once satisfied with a click-through, delete `app-nuxt-legacy/`
  and the now-unused `@iconify-json/*` devDependencies.
- **Decide on the GitHub connector's fate** (see Phase 3 above).

## Environment

- `AI_GATEWAY_API_KEY` or a `VERCEL_OIDC_TOKEN` (via `vercel link`) is
  required for the agent to respond at all — `agent/agent.ts`'s
  `anthropic/claude-sonnet-4.6` model string routes through Vercel AI
  Gateway, not a direct Anthropic key. Confirmed working locally via
  `vercel link`.
- Tailwind v4 under Turbopack needs `postcss.config.mjs` with
  `@tailwindcss/postcss` — this was missing (pre-dated this session) and
  produced a completely unstyled app; now fixed.
- See `docs/ENVIRONMENT.md` for the full variable list; Drive/HubSpot
  connector variable names are still provisional pending Phase 3.

## Gotchas (non-obvious, worth not re-discovering)

- **Next.js 16's `proxy.ts` reads a `config` export, not `proxyConfig`**,
  despite some docs/skills claiming otherwise — verified directly against
  `node_modules/next/dist/build/analysis/get-page-static-info.js`.
- **shadcn CLI defaults to Base UI now, not Radix** — AI Elements requires
  Radix (`shadcn init -d --base radix -f`), otherwise Radix-wrapped
  components fail type-check.
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
