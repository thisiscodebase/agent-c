# Progress: Phase 0-2 stand-up

Working notes on the state of the `agent-c` → "CodeBase Agent" migration, for
picking this back up in a future session. See
[`docs/ROADMAP.md`](ROADMAP.md) for the original phase plan and
[`docs/ARCHITECTURE.md`](ARCHITECTURE.md) for the resolved design decisions.

## Status: Phase 0-2 done and verified. Phase 3-4 not started.

Two commits on `main`:

1. `Phase 0: rebrand to CodeBase Agent, remove iMessage/Linear/weather`
2. `Migrate web from Nuxt to Next.js, add Postgres + Google OAuth`

## What's done

- **Rebrand**: `package.json`, `shared/agent.ts`, `AGENTS.md`, root `README.md`
  (upstream's generic README preserved at `docs/original/README.md`).
- **Persona**: `agent/lib/base-instructions.ts` and `agent/instructions.ts`
  rewritten for CodeBase's scope; `daily-summary.md` de-Linear'd with a
  Phase 3/4 TODO for the fuller activity-digest rework.
- **Deleted**: Sendblue/iMessage channel, the entire phone-linking feature
  (`phone_links` table, profile phone field — confirmed its only consumer
  was Sendblue), Linear connection, the `weather` example tool. All
  references cleaned up (schemas, connectors, UI).
- **Framework**: Nuxt → Next.js (App Router), via `eve/next`'s `withEve()`.
  Confirmed the two-service `vercel.json` split (`experimentalServices.web`
  + `.eve`) carries over unchanged — just `web.framework: "nuxtjs"` →
  `"nextjs"`. Old Nuxt `app/` preserved at `app-nuxt-legacy/` as a porting
  reference; delete it once Phase 7 (below) is done and verified.
- **All 17 Nitro API routes** ported to Next.js Route Handlers under
  `app/api/`, via `server/utils/http-error.ts` (an `HttpError`/`createError`
  shim so the original `server/utils/*.ts` business logic needed zero
  changes beyond import paths) and `server/utils/route-handler.ts` (a
  `withRoute()` wrapper that catches `HttpError`/`ZodError` and returns the
  right `NextResponse`).
- **Auth**: two-tier — `proxy.ts` does a cheap cookie-presence redirect
  (`better-auth/cookies`'s `getSessionCookie`); `app/(app)/layout.tsx` does
  the authoritative `auth.api.getSession()` check. Google Workspace OAuth
  (domain-restricted via `hd`) replaces email/password in
  `server/utils/auth.ts`; new login page at `app/login/page.tsx`.
- **Postgres**: schema converted to `pgTable` (`server/db/schema/*.ts`),
  `server/db/client.ts` (postgres-js, `{ prepare: false }` for Supavisor
  transaction-mode pooling), `drizzle.config.ts`, first migration generated
  and applied against a local `supabase start` instance, pgvector enabled.
  Verified table list: `user`, `session`, `account`, `verification`,
  `user_memory`, `user_profiles`, `threads`, `slack_links`,
  `slack_link_codes` — no `phone_links`.
- **shadcn/ui + Vercel AI Elements installed**, ready for the UI build.
  `components/ui/*.tsx` (shadcn primitives, Radix-based — **not** Base UI,
  see gotcha below) and `components/ai-elements/*.tsx` (Conversation,
  Message, Prompt Input, Reasoning, Sources, Tool, Confirmation, Suggestion
  — pruned from the full AI Elements set to just what this app needs).

### Verification already done

- `pnpm exec tsc --noEmit` — clean.
- `pnpm exec next build` — clean, all routes registered correctly.
- Live dev server (`pnpm dev`) tested with curl against a running local
  Supabase instance:
  - `/` (unauthenticated) → 307 to `/login` ✓
  - `/login` → 200, not redirected ✓
  - unmatched path → 404 (proxy matcher correctly scoped) ✓
  - `/eve/v1/health` → 200 (eve reachable same-origin) ✓
  - `/api/connectors` (no session) → 401 ✓
  - `/api/internal/slack/link/member` without bearer secret → 401, with
    correct secret → 200 ✓
  - `POST /eve/v1/session` without a session cookie → 401 (agent/channels/eve.ts's
    `appSession()` correctly fails closed) ✓

## What's NOT done (next session starts here)

### Task 6 — Port composables to React hooks

The old Vue composables at `app-nuxt-legacy/composables/` need React
equivalents. Mechanical ports onto **TanStack Query** (already installed):
`useProfile`, `useMemory`, `useConnector(s)`, `useSlackLink`, `useSite`,
`useThreads`, `useThreadGroups`.

**Not mechanical** — three files rely on Vue's module-scope `ref()` pattern
for cross-component state, which React has no direct equivalent for. Use
`useSyncExternalStore` + a small hand-rolled store for each:
- `chat/providers/eve/init.ts` (per-chat agent instance cache)
- `chat/useAuthorizationChallenges.ts` (authorization prompt pub/sub)
- `chat/providers/eve/stream-log.ts` (dev-only debug state)

**Check first whether these three are even still needed** — `eve/react`'s
`useEveAgent` (see `node_modules/eve/docs/guides/frontend/overview.mdx`) is
the officially-supported reference implementation and already natively
handles resumable sessions (`initialEvents`/`initialSession`/`onFinish`),
HITL (`dynamic-tool` parts with `toolMetadata.eve.inputRequest`), and
authorization prompts (`authorization` message part with `state`/`outcome`).
The old Vue app was built against a lower-level `eve/vue` API — some of this
custom state management may already be handled by `eve/react`'s built-in
reducer. Read that doc before porting `useAuthorizationChallenges.ts`
verbatim.

`chat/navigation.ts` needs real rework too: Nuxt's payload-cache
manipulation → `queryClient.setQueryData`/`invalidateQueries`; `navigateTo`
→ `useRouter().push()`. The View Transitions API usage
(`document.startViewTransition`) is a plain browser API and ports as-is.

### Task 7 — Build the Next.js UI

Port all pages/components from `app-nuxt-legacy/pages/` and
`app-nuxt-legacy/components/` to `app/` using shadcn/ui primitives + the
AI Elements components already installed. Roughly:

| Old (Vue/Nuxt UI) | New |
|---|---|
| `UChatMessages`, message list | AI Elements `Conversation` + `Message` |
| `UChatPrompt`/`UChatPromptSubmit` | AI Elements `Prompt Input` |
| `UChatReasoning` | AI Elements `Reasoning` |
| `ChatToolSources` | AI Elements `Sources` |
| tool-call rendering | AI Elements `Tool` |
| `ToolSaveMemory`/HITL approval | AI Elements `Confirmation` |
| quick-chat pills on home page | AI Elements `Suggestion` |
| `UDashboardSidebar`, nav, settings | shadcn `Sidebar`/`Card`/`Tabs`/`Sheet` |
| `⌘K` search | shadcn `Command` + `Dialog` |
| Comark markdown rendering | check for a framework-agnostic Comark core, else `react-markdown` + existing `shiki` |

Pages to build: home (`app/(app)/page.tsx` — already a placeholder),
`chat/[id]`, `settings/profile`, `settings/integrations`. Presentational
pieces (Navbar, Logo, BrandMark, UserMenu, ThreadList, settings nav/row/
section) port mechanically once the hooks from task 6 exist.

### Task 13 — End-to-end verification

Once the UI exists: click through chat send → thread creation → streaming
→ tool calls, memory approve/reject, profile edit, Slack link-code flow,
threads CRUD, in an actual browser (start the dev server, use the app).
Then delete `app-nuxt-legacy/` and the now-unused `@iconify-json/*`
devDependencies.

## Gotchas hit this session (don't re-debug these)

- **`node_modules/eve/docs/`**, not `node_modules/eve/dist/docs/public/` —
  `AGENTS.md` had a stale path, now fixed.
- **shadcn CLI defaults to Base UI now, not Radix** — AI Elements requires
  Radix (`shadcn init -d --base radix -f`) or you get `ForwardRefExoticComponent`
  type errors on every Radix-wrapped component.
- **`tw-animate-css`'s package.json only exports a non-standard `"style"`
  condition** — Turbopack can't resolve it. Dropped the import entirely;
  Tailwind v4's built-in utilities cover what's needed.
- **A stale orphaned `react@19.2.6` in the pnpm store** (not in the lockfile,
  left over from before `react`/`@types/react` were explicitly pinned) caused
  every Radix component to fail type-check with `IntrinsicAttributes`-shaped
  errors. Fixed by `rm -rf node_modules && pnpm install`. If this class of
  error reappears, check `find node_modules/.pnpm -maxdepth 1 -iname "react@*"`
  for duplicates first.
- **Next.js 16's `proxy.ts` reads a `config` export, not `proxyConfig`** —
  despite what some docs/skills say. Verified directly against
  `node_modules/next/dist/build/analysis/get-page-static-info.js`. Function
  export name is `proxy` (or `middleware`, or a default export — all three
  work). `export const runtime` is disallowed in `proxy.ts` — it always runs
  on Node.js, no opt-out.
- **AI Elements registry install (`shadcn add <url>`) is flaky** when piped
  non-interactive input — it can misdetect an empty target directory as "no
  project here" and offer to scaffold a fresh Next.js app. If that happens,
  `rm -rf components/ai-elements` and instead fetch the registry JSON
  directly (`curl .../api/registry/all.json`) and extract just the `files[].content`
  you need via a small `node -e` script — see git history for the exact
  approach if needed again.
- **shadcn's June 2026 chat-components release has no composer/prompt-input
  component** — use Vercel AI Elements instead (built on shadcn, ships a
  `Prompt Input`, and its messages format matches `eve/react`'s `UIMessage`
  convention natively).
