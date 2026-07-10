# 🍊 Agent C

An internal knowledge and case-study assistant for CodeBase, forked from
[`vercel-labs/personal-agent-template`](https://github.com/vercel-labs/personal-agent-template).

Where the upstream template is a single-user personal assistant, this fork is
scoped as a shared, whole-company tool (~20-100 users). Its core job: let
colleagues look up information across Google Drive, HubSpot, Notion, and Slack
that they currently can't easily search, and turn that into structured outputs —
principally customer case studies and other reports — without leaving chat or
Slack.

Full context on _why_ this direction was chosen over alternatives (build vs.
Notion AI, template comparison, connector auth model, search architecture,
framework choice) lives in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/CUSTOMIZATION.md`](docs/CUSTOMIZATION.md).

## What this is for

- **Lookup**: "What have we done for [customer]? Pull anything from Drive,
  HubSpot, Notion, or Slack."
- **Synthesis**: turn that lookup into a case study, report, or note — stored
  centrally, reviewed before publishing, exportable to Drive or as a file.
- **Meta-features**: agent-native outputs that only work because the agent sees
  everything at once — e.g. a daily/weekly digest of case-study-relevant
  activity across connected sources. This is also the adoption lever: it's the
  thing a new colleague sees without having to know how to ask the agent
  anything.

## What this is _not_, at least for v1

- Not a replacement for Drive, HubSpot, Notion, or Slack's own search — it
  queries them live via MCP connectors rather than re-indexing their content.
- Not a coding agent — no code changes, no PRs. That's a deliberately separate
  future integration; see [`docs/ROADMAP.md`](docs/ROADMAP.md).
- Not (yet) collaborative in the sense of multiple people co-present in one live
  session — same roadmap doc, same caveat.

## Surfaces

- **Web** — chat interface, settings/integrations, and a case-study / artifact
  browser and review queue.
- **Slack** — DM or `@mention` the agent directly; identity is linked to the
  same web account so context (and memory) follows the person across surfaces.

## Repo layout

Mirrors the upstream template's two-service split — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full breakdown:

```
agent/      # Eve agent runtime service — channels, tools, connections, skills
app/        # web app — chat UI, settings, case-study/artifact browser
server/     # web service backend — auth, db, internal API to agent/
shared/     # types and config shared between web and agent
docs/       # this documentation set
```

## Getting started

1. Read [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) for required environment
   variables per service.
2. Read [`docs/CUSTOMIZATION.md`](docs/CUSTOMIZATION.md) for what's changed from
   the upstream template and why.
3. Read [`docs/ROADMAP.md`](docs/ROADMAP.md) for the phased build plan and an
   honest scope/difficulty assessment of the stretch goals.

## Development

```bash
pnpm install
pnpm dev          # Next.js + Eve dev server
pnpm typecheck    # TypeScript check
pnpm build        # Production build
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Apply migrations
```

See [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) for required environment
variables and connector provisioning.

## Status

Phases 0–3 code complete (chat + connectors). Phase 4 (artifacts) and Phase 5
(Slack polish) remain. See [`docs/PROGRESS.md`](docs/PROGRESS.md) and
[`docs/ROADMAP.md`](docs/ROADMAP.md).
