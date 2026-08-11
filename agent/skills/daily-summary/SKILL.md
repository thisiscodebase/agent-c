---
description: Use when the user asks for a daily summary, morning briefing, activity digest, or "summarize my day".
# Not exposed in the composer `/` picker yet — keep for a future product pass.
---

# Daily summary

Produce a scannable cross-source activity briefing for CodeBase — live connector signal plus the user's focus, not a memory-only todo list.

## Window

- Default: **today** (calendar day in Europe/London), using the current date from the system prompt.
- If the user says "yesterday", "this week", or a named range, use that window instead.
- Early morning briefings (before ~09:00) may include late activity from the previous business day when today is still empty — say so in one line.

## Procedure

1. **Read memory first** (injected — do not call tools for this):
   - `active_focus` — companies, deals, programmes, people to prioritise
   - `work_context` — role / team cues that steer which sources matter
   - If focus is empty, brief from live activity alone and note that no active focus is saved.

2. **Gather live signal in parallel** (soft budget **≤4 tool steps**; prefer parallel). Choose sources from focus + role — do **not** spray every connector:

   | Source | When | How |
   | --- | --- | --- |
   | Drive | Default for file activity | `list_recent_drive` (pageSize ~10). Keep items whose `modifiedTime` falls in the window. |
   | Slack | Default for chatter / mentions of focus names | `search_slack` with focus company/person names plus a date cue (today's date or `after:YYYY-MM-DD`). Prefer messages; limit ~10. |
   | HubSpot | Focus includes companies, contacts, or CRM work | `connection_search` once if tools unknown; search COMPANY by focus names (include `database_record_id`); contacts via `associatedWith` company id. Never blank-query contacts, deals, notes, or emails. Skip DEAL unless focus is deal-specific. |
   | Platform | Focus includes programmes, mentorship, or bookings | `platform__search_sessions` (and related get_* tools) scoped to today / focus companies. Read-only. |
   | Notion | Only if focus names specific docs/notes, or work is docs-heavy | `notion__notion-search` once; fetch at most one page if a hit is clearly in-window. |
   | Tally | Only if the user asks about forms/surveys in the briefing | Skip by default. |

3. **Synthesise** after two sources return useful signal. Stop widening. State gaps plainly ("HubSpot not searched", "no Slack hits for X").

4. **Reply in chat** with this structure (omit empty sections):
   - **Focus** — one short line from memory (or "No active focus saved")
   - **Moving** — CRM / Platform changes that matter (company/contact updates, sessions; deals only if relevant)
   - **Talk** — Slack threads worth knowing (link the claim)
   - **Files** — Drive (and Notion if used) updates worth opening
   - **Suggested next** — **one** concrete next action grounded in the evidence

5. **Artifact** — only if the user asks to save it, or the digest is clearly keep-worthy (multi-source, named accounts). Then `create_artifact` with `type: "summary"`, metadata `{ kind: "daily_summary", window: "…" }`. Say what you saved in one short line; do not paste the document body into chat.

## Rules

- Never invent CRM records, Slack messages, Drive files, Platform sessions, Notion pages, or deal-stage changes.
- Cite with claim-linked permalinks per base instructions.
- Keep it scannable — short bullets, not source dumps.
- Match the user's language.
- If a connector is unauthorized, skip it and note it; do not pretend the data exists.

## When not to use

Ordinary single-source lookups, bid drafting (`bid-writing`), or full case-study write-ups. For those, follow the general playbook or the other skill.
