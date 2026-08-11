# Agent C — instruction & cost review (rev. 2)

## Context

`agent/lib/base-instructions.ts` is Agent C's whole behavioural contract: 193 lines / ~5,580 tokens,
assembled per session in `agent/instructions.ts` and appended with the user's memory block. This
review compares it to three shipped production prompts (Claude Code 2.0, Cursor Agent 2.0, Notion
AI), then measures where Agent C's tokens actually go, and proposes an implementation for each
recommendation.

**What changed in rev. 2.** Rev. 1 recommended building an eval suite first and framed a
connector/skills split as a context saving. Measurement contradicted both:

- The system prompt is **0.7%** of the token cost in the recorded corpus. Prompt trimming is noise.
- **97.9%** of the largest tool payload is one Slack API field enabled by one boolean. The cost
  problem is tool-result hygiene, in TypeScript, not prompt design.
- Eve ships a first-class evals framework (`node_modules/eve/docs/evals/`), so "build assertions" is
  configuration rather than infrastructure — but there is still no case for a graded suite yet.

## Measured baseline

Extracted from `docs/prod_chats.json` (9 threads, 7,296 events) and `docs/local_chats.json`
(11 threads, 3,227 events). 121 tool calls, 3.1 MB ≈ 780k tokens of tool results.

| tool | calls | total | avg/call | owned by |
| --- | --- | --- | --- | --- |
| `search_slack` | 35 | 2,182 KB | ~15k tok | **us** (`agent/tools/search_slack.ts`) |
| `connection_search` | 23 | 418 KB | ~4k tok | Eve |
| `hubspot__search_crm_objects` | 15 | 241 KB | ~4k tok | remote MCP |
| `notion__notion-fetch` | 9 | 180 KB | ~5k tok | remote MCP |
| `hubspot__get_user_details` | 4 | 42 KB | ~2k tok | remote MCP |
| `platform__*` (all) | 17 | ~2 KB | ~0 tok | **us** |

One average `search_slack` call costs ~2.7× the entire system prompt — and the prompt is cached on
every request while tool results are not. The largest single result is **717 KB (~179k tokens)** for
20 Slack messages. The Platform tools we designed return ~0 KB; the efficient tools are the ones we
control, which is also why the expensive one is fixable.

### Two caveats on this corpus

1. **It predates the current prompt.** Transcripts run 2026-07-13 → 2026-07-21. Six commits have
   rewritten `base-instructions.ts` since, including `c00b73d` (2026-07-31) which added the entire
   Tool-efficiency section. So the 23 `connection_search` calls happened *before* the rule limiting
   them existed — I cannot claim that rule is failing. **We currently have zero recorded
   observations of the prompt as it stands.**
2. It is valid for **tool payload economics**, which are structural and tool-side, and unchanged by
   any of those commits.

## What the prompt comparison found

**Structural:** Claude Code and Cursor keep per-tool mechanics in tool descriptions and reserve the
system prompt for cross-cutting policy (~80% and ~66% of their behavioural guidance lives in tool
schemas). Agent C inverts this — ~50 of 193 lines are connector mechanics held in context every turn.
Given the measurements, this matters for **attention and maintainability, not cost**.

**Substantive gaps**, in rough value order:

1. The tool budget caps *effort* (`≤4 tool steps`, `after two sources, synthesise`) with no floor
   saying "keep going if unanswered". Notion caps only *redundancy*; Cursor supplies the
   counterweight ("keep going until the query is completely resolved"). `bid-writing` already had to
   carve out its own budget — a signal the global one doesn't fit every task shape.
2. Worked examples appear in exactly one section (Citations) — which is also the most precise and
   best-followed part of the file. The lookup playbook is an abstract intent table with no example
   utterances.
3. No first-move default for ambiguous one-word messages (Notion has an explicit one).
4. Parallel tool calls are never authorised, despite the playbook implying them.
5. 53 prohibitions in 193 lines, several without a positive substitute.
6. Low-stakes sections (Greetings, Boundaries) occupy the highest-attention closing position; the
   memory block lands after everything. Date/time is buried in the playbook and has spawned a patch
   line telling the model not to shell for it.
7. Format guidance is channel-blind, though the citation rules are justified by web-only UI behaviour.
8. No general refusal rule, no scope-discipline rule, no gender-neutral-language rule — all three
   references have at least two of these, and Agent C reads people's records all day.
9. Nothing stops `platform__search_companies`-style identifiers leaking to non-technical users.
10. `agent/channels/slack.ts` hardcodes **"V"** in user-facing strings while `shared/agent.ts` says
    "Agent C" — including the thread transcript prefix fed back into context.

**Already ahead of all three references** and worth preserving: the link-the-claim citation style,
the HubSpot↔Platform id bridge, and `create_artifact`'s `toModelOutput` context trimming.

---

# Part 1 — Cost and performance

## C1. Project `search_slack` output (the single biggest win)

**Finding.** `agent/tools/search_slack.ts:63` sets `include_context_messages: true`, and the return
at lines 100–105 passes Slack's raw objects straight through. The declared TypeScript shape is not a
runtime projection — fields never declared (`team_id`, `channel_id`, `author_user_id`,
`is_author_bot`, `context_messages`) all reach the model. Field breakdown of the 690 KB call:

| field | size | share |
| --- | --- | --- |
| `context_messages` | 676 KB | **97.9%** |
| `content` | 11 KB | 1.7% |
| everything else | ~3 KB | 0.4% |

**Implementation** — project explicitly, truncate bodies, make context opt-in:

```ts
const MAX_CONTENT_CHARS = 800;
const MAX_CONTEXT_MESSAGES = 3;

function trimText(value: unknown, max: number): string {
  const text = typeof value === "string" ? value : "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function projectMessage(m: Record<string, unknown>, includeContext: boolean) {
  return {
    content: trimText(m.content, MAX_CONTENT_CHARS),
    author_name: m.author_name,
    channel_name: m.channel_name,
    permalink: m.permalink,
    message_ts: m.message_ts,
    ...(includeContext && Array.isArray(m.context_messages)
      ? {
          context_messages: m.context_messages
            .slice(0, MAX_CONTEXT_MESSAGES)
            .map((c) => trimText((c as { content?: unknown }).content, 300)),
        }
      : {}),
  };
}
```

Add the input flag, defaulting off, and describe its cost so the model self-limits:

```ts
includeContext: z
  .boolean()
  .optional()
  .describe(
    "Include surrounding thread messages for each hit. Expensive — only set true when the thread around a message matters, e.g. resolving a permalink or reconstructing a decision.",
  ),
```

Then `include_context_messages: includeContext ?? false` in the request body, and map results
through `projectMessage` in the return.

**Shape correction (found while implementing).** `context_messages` is **not** an array. It is
`{ before?: Entry[]; after?: Entry[] }` with entries keyed `text` (not `content`), alongside `ts`,
`user_id`, `author_name` — and the lists run up to **991 entries** per hit. The original declared
type claimed a flat array, so a naive projection would have silently dropped context rather than
truncating it. Project the tail of `before` and the head of `after` to keep the entries nearest the
hit.

**Truncation is calibrated, not guessed.** Slack bodies are long-tailed — median ~414 chars, p90
~2,182, max ~6,000 across 188 recorded messages. An 800-char cap truncates **34%** of them; 2,000
truncates **10%** and costs only ~1.7 KB more per call, because the savings come almost entirely
from `context_messages`, not from bodies. Hence `MAX_CONTENT_CHARS = 2000`.

**Effect, measured across all 22 recorded `search_slack` results:**

| | payload | change |
| --- | --- | --- |
| before | 2,100 KB | — |
| after, default (`includeContext` off) | 168 KB | **−92.0%** |
| after, `includeContext` forced on every call | 335 KB | −84.0% |

Corpus-wide tool payload 3,133 KB → ~1,201 KB (**−62%**). The opt-in path stays bounded, so the
model cannot reintroduce the original blowup by setting the flag.

**Why projection beats `toModelOutput` here.** `toModelOutput` shrinks what the model sees but the
full payload still lands in stored thread state (that's what made one thread 4 MB). Projecting inside
`execute` fixes both.

**Risk:** low. The truncation could drop the sentence that answered the question — mitigated by
`MAX_CONTENT_CHARS` at 800 and the opt-in context flag. Watch for the agent re-searching to recover
lost detail; if that appears, raise the cap rather than restore passthrough.

## C2. Tier reasoning effort

**Finding.** `reasoning: "high"` applies to every turn from the static field at `agent/agent.ts:31`.
`reasoningForTier()` (`shared/models.ts:86`) is **dead code** — never imported anywhere.
`ResolvedModelSelection.reasoning` is computed in `buildAgentSelection` but the dynamic resolver in
`agent.ts` returns only `model` and `modelOptions`, so it is never consumed. Reasoning tokens are
output-priced and never cached, on every turn including "who owns this account".

**Implementation** — `shared/models.ts`:

```ts
export type ReasoningEffort = "low" | "medium" | "high";

export function reasoningForTier(tier: ModelTier): ReasoningEffort | undefined {
  if (tier === "nano") return undefined;
  return tier === "chat" ? "medium" : "high";
}
```

Widen `ResolvedModelSelection.reasoning` from the literal `"high"` to `ReasoningEffort`, and set it
via `reasoningForTier(tier)` in `buildAgentSelection`. Add an `agent-reasoning` flag in `flags.ts`
mirroring `agentTier`, so effort is tunable without a deploy.

**Verify first:** the `defineAgent` field is typed `AgentReasoningDefinition`
(`node_modules/eve/docs/agent-config.md:225`), which by analogy with `model` likely accepts
`defineDynamic`. Confirm against the TS types before wiring; if it doesn't, drive it from the flag at
module scope instead. Supported values are `provider-default | none | minimal | low | medium | high |
xhigh`.

**Risk:** medium — this is the one change that can degrade answer quality. Ship it behind the flag,
default `chat` to `medium`, and keep `premium`/`extreme` at `high`.

## C3. Put a ceiling under runaway threads

**Finding.** One prod thread reached 4 MB of state and 26 tool calls. Eve has framework-owned caps we
aren't using.

**Implementation** — `agent/agent.ts`:

```ts
limits: {
  maxInputTokensPerSession: 400_000,
  maxOutputTokensPerSession: 60_000,
},
compaction: { thresholdPercent: 0.75 },  // default 0.9
```

Compaction is on by default at 0.9; lowering it trades a summarisation call for a much smaller
resent context on every subsequent turn — favourable once threads run past ~10 tool calls. The
`limits` are a backstop against a single session quietly consuming the month's budget. Pick the
numbers from your actual Gateway spend; the ones above are placeholders.

**Risk:** low, but compaction is lossy — set the threshold, then re-read a long thread to confirm
nothing important is being summarised away.

## C3b. Budget against the cheap pricing tier, not model capacity

Gateway `context_window` is **capacity**, not the window you want to use. Several models step up
per-token pricing partway through it (`pricing.input_tiers`), and above the step, input, output,
cache read and cache write all roughly double:

| model | capacity | price cliff | above the cliff |
| --- | --- | --- | --- |
| `openai/gpt-5.6-luna` | 1,050,000 | **272,000** | $0.20/M → $0.40/M |
| `openai/gpt-5.6-terra` | 1,050,000 | **272,000** | $2.00/M → $4.00/M |
| `openai/gpt-5.6-sol` | 1,050,000 | **272,000** | $5.00/M → $10.00/M |
| `xai/grok-4.5` | 500,000 | **200,000** | $2.00/M → $4.00/M |
| `anthropic/claude-sonnet-5` | 1,000,000 | none | flat $2.00/M |
| `openai/gpt-5.4-nano` | 400,000 | none | flat $0.20/M |

This matters because `compaction.thresholdPercent` is a fraction of the window Eve looks up from the
Gateway. Left alone, `0.85 × 1,050,000` means a luna thread compacts at ~892k — hundreds of
thousands of tokens *after* it started paying double.

The fix is the documented `modelContextWindowTokens` escape hatch on the dynamic model selection:
return the cheap-tier boundary and Eve budgets against that instead. One number,
`contextWindowForModel()`, now drives both Eve's compaction trigger and the context ring, so "full"
in the UI means "about to get expensive" rather than "about to fail".

Effective budgets: luna/terra/sol compact at 231,200; grok at 170,000; sonnet-5 keeps its full
1,000,000 (850,000 trigger) because it prices flat and early compaction would be pure loss.

The production thread that prompted this peaked at **263,393 — 96.8% of the cheap tier, 8,607
tokens short of paying double.** It now compacts instead.

## C4. `connection_search` (measure before acting)

23 calls / 418 KB in the corpus, but that corpus predates the rule limiting them. **Do not change
the prompt here yet.** Instrument (M1), get two weeks of current-prompt data, and only then decide
between a stronger prompt rule and a code-level short-circuit. If it does still need fixing, the
cheapest route is naming the known tools for each connector inline in the connector sections so
discovery is unnecessary — several are already named there.

---

# Part 2 — Prompt quality

These are quality changes. Only P4 and P5 move cost meaningfully (downward); P1 moves it upward.

## P1. Re-target the budget at redundancy, not effort

Replace the two budget bullets in **Lookup playbook** with:

```md
- Stop when you can answer the question well — not at a fixed step count. Do not stop while a
  material part of the request is still unanswered.
- Do not repeat work: never re-run a tool with near-identical input in the same turn, and if two
  searches for the same fact come back thin, a third will not help — say what is missing instead.
- Scale effort to the request. A single lookup should take 1–2 calls. A digest, case study, or bid
  draft legitimately takes more; keep going until it is properly evidenced.
- After two sources give useful signal on a *simple* lookup, synthesise. State gaps explicitly
  ("nothing in Platform; Slack not searched") rather than sweeping every connector.
```

**Note this raises cost on complex requests** — deliberately, since premature synthesis on a bid
draft is the expensive failure. C1 and C2 more than pay for it.

## P2. Add worked routing examples

Append to **Lookup playbook**, modelled on Notion's decision block and on your own Citations section
(the file's best-followed rules are its only exemplified ones):

```md
Routing examples:

- "what do we know about Vidai?" → Platform + HubSpot company search in parallel, bridge by id,
  then Notion or Slack only if the narrative is thin.
- "who owns the eCerto account?" → HubSpot COMPANY search with a minimal properties list. One call.
- "what did we decide about the mentor rota?" → Slack first; decisions live in discussion.
- "how many people completed TSG1?" → Platform, then Tally if the number is survey-derived.
- "Vidai" (bare noun phrase) → treat as "what do we know about X", not as a request to clarify.
- "can you write up the Singapore trip as a case study?" → gather first (Platform, Slack, Drive),
  then `create_artifact`. Do not draft from one source.
```

## P3. First-move default for ambiguous messages

Add to **Lookup playbook**:

```md
When a message is a bare noun phrase, a name, or otherwise ambiguous, search before asking. One
broad, well-chosen lookup beats a clarifying question asked from zero context — and if you still
need to clarify afterwards, you can ask a sharper question.
```

## P4. Authorise parallel calls

Add to **Tool efficiency** (cost-reducing: fewer turns means less context re-sent):

```md
- Issue independent tool calls in a single message so they run in parallel. When the playbook says
  to check two systems (e.g. Platform *and* HubSpot for a company), send both at once rather than
  waiting for the first.
```

## P5. Cost-awareness the model can act on

Add to **Tool efficiency** — the model cannot see payload sizes, so tell it:

```md
- Tool results stay in context for the rest of the conversation, so a wasteful call is paid for on
  every later turn. Prefer narrow queries and small result limits; request `includeContext` on
  Slack search or fetch a full Notion page only when the snippet genuinely does not answer it.
```

## P6. Restructure

- Move date/time (and channel, user) into a `# Context` block at the top, as Notion's `<context>`
  and Claude Code's `<env>` do. This makes the "do not shell for the current date" patch line
  deletable.
- Move **Greetings** and **Boundaries** up; end the file on the non-negotiables (don't invent
  records, citation discipline). Claude Code repeats its hardest constraints verbatim at the close —
  worth copying for "never invent CRM/Drive/Notion/Slack/Tally/Platform content".
- In `agent/instructions.ts`, put the memory block *before* a short closing rules block rather than
  last, so user prose isn't the final thing read.

## P7. Channel-conditioned formatting

`agent/channels/slack.ts` already builds a `context` array per turn. Add a Slack-specific formatting
note there rather than branching the base prompt:

```ts
context.push(
  "You are replying in Slack. Use short paragraphs and Slack-flavoured markdown. No tables, no " +
  "headings, no chart fences. Cite sources as plain markdown links — the inline source-chip UI is " +
  "web-only.",
);
```

Then scope the Citations UI claim in the base prompt to web chat.

## P8. The three missing sections

Add, adapting Notion's wording:

```md
# Limits

If you cannot do something, say so in one line and name the alternative — do not explain at length
or string the user along. Platform, HubSpot, Notion, Tally and Drive are read-only here: for a
change, say which system to make it in. Never refer to tools by their internal names
(`platform__search_companies`); describe what you are doing in plain language.

# Scope

Do not do more than asked. When someone asks you to think through, review, or summarise something,
answer in chat — do not save an artifact or write to memory unless they asked for a document or
shared a lasting preference.

# People

Never infer someone's gender from their name. When pronouns are unknown, use "they" or rephrase to
avoid pronouns. CRM records, Slack messages and Platform users are full of names without pronouns —
this is the normal case, not an edge case.
```

## P9. Branding

Replace the hardcoded "V" in `agent/channels/slack.ts` (5 user-facing strings plus the transcript
prefix) with `agent.name` from `shared/agent.ts`.

---

# Part 3 — Measurement

## M1. Instrument tool cost (do this first)

You have the data in the event stream already — I extracted it by joining `actions.requested`
(`data.actions[].callId` / `toolName`) to `action.result` (`data.result.callId`). Surface it in the
existing admin thread inspection: **per tool call — name, input, result bytes, duration**, and a
per-thread total. That gives you a live version of the table at the top of this document, makes C1's
effect visible immediately, and is the substrate for evals later.

## M2. Assertions, not an eval suite

At 9 threads from a couple of internal users, a graded suite would encode *your* query style as if it
were the organisation's, and you'd spend weeks optimising against a fiction. Defer answer-quality
evals (`t.judge.*`, `similarity`) until you can no longer read every thread by hand — roughly 50–100
chats.

Deterministic **behavioural assertions** are worth having now, because the failure list already
exists: it is written into the prompt as scar tissue. Eve discovers `.eval.ts` files under `evals/`
with an `evals.config.ts` at the root, run via `eve eval`:

```ts title="evals/lookup/company-digest.eval.ts"
import { defineEval } from "eve/evals";

export default defineEval({
  description: "A bare company name routes to company search and bridges by id, without spraying.",
  async test(t) {
    await t.send("Vidai");
    t.succeeded();
    t.calledTool("platform__search_companies");
    t.notCalledTool("hubspot__get_user_details");   // prophylactic-call rule
    t.maxToolCalls(6).soft();                        // track, don't gate
  },
});
```

```ts title="evals/hygiene/no-blank-crm-search.eval.ts"
import { defineEval } from "eve/evals";

export default defineEval({
  description: "Never issues an unfiltered CRM search.",
  async test(t) {
    await t.send("who are our contacts?");
    t.notCalledTool("hubspot__search_crm_objects");
    // or, allowing a scoped search but banning a blank query:
    // t.calledTool("hubspot__search_crm_objects", {
    //   input: (i) => typeof i.query === "string" && i.query.length > 0,
    // });
  },
});
```

Start with ~6 covering the scar-tissue rules whose failures you actually remember: blank CRM query,
empty-string/nil-UUID Platform args, `connection_search` repeats, inventing a Platform URL, Drive
"not callable" without an attempt, and duplicate `save_memory` calls. Use `.soft()` for anything
you want tracked rather than enforced — tool-count budgets especially, since P1 deliberately raises
them for complex work.

Keep a running failure log as you dogfood, and promote an entry to an assertion once it recurs.

---

# Sequencing

| # | Work | Effort | Effect |
| --- | --- | --- | --- |
| 1 | **C1** `search_slack` projection | ✅ done | −62% total tool payload (measured) |
| 2 | **M1** tool-cost telemetry | half day | makes everything else observable |
| 3 | **C3** compaction at 0.85 | ✅ done | smaller resend on long threads |
| 3b | **C3** session token limits | deferred | hard stop mid-task; needs real spend data |
| 4 | **P1–P5** prompt changes | ✅ done | routing quality; P4/P5 reduce cost |
| 5 | **C2** reasoning tiering (flagged) | ~1 hr | large output-token saving, needs judgement |
| 6 | **P6–P9** structure, sections, branding | half day | quality and polish |
| 7 | **M2** six assertions | half day | locks in the above |
| 8 | **C4** revisit `connection_search` | — | only after two weeks of M1 data |

Deliberately dropped from rev. 1: moving connector playbooks into on-demand skills. It saves ~140
effective tokens per request against 780k tokens of tool payload. Revisit only if the prompt keeps
growing and precision suffers — as a maintainability change, not a cost one.

# Verification

- **C1:** re-run the extraction script against fresh threads; the same Slack query should drop from
  ~62 KB to under 2 KB per call. Then read a Slack-heavy thread end to end and confirm answer quality
  holds — this is the one change where the metric could improve while the answer gets worse.
- **C2:** flag on for one user, compare a routing-heavy digest at `medium` vs `high` side by side
  before rolling out.
- **C3:** run a long thread past the compaction threshold and read the summarised turns.
- **P1–P9:** `pnpm dev` and exercise both surfaces — web chat and a Slack DM — with the six routing
  examples from P2 as the manual script. P7 specifically needs checking in Slack, not just web.
- **M2:** `eve eval` green, and each assertion demonstrated to fail against a deliberately broken
  prompt before you trust it.
