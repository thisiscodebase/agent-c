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

2. **Gather live signal in parallel** via specialists in **one** message (soft budget **≤2 subagent calls** plus at most one follow-up). Pack focus names, the date window, and role cues into each `message`. Do **not** spray every connector yourself — `search_slack` dumps belong in `slack-scan`, not this thread:

   | Source | When | How |
   | --- | --- | --- |
   | Drive / HubSpot / Platform / Notion / Tally / Retool | Per the table below, batched into **one** `researcher` call | Tell `researcher` which sources to hit and the window. Drive: recent files in-window. HubSpot: COMPANY by focus names (`database_record_id`); contacts via association — never blank-query; skip DEAL unless focus is deal-specific. Platform: sessions scoped to today / focus companies. Notion: only if focus names docs; at most one fetch. Tally/Retool: only if the user asked. |
   | Slack | Default for chatter / mentions of focus names | **`slack-scan`** with focus company/person names plus a date cue (today's date or `after:YYYY-MM-DD`). Prefer messages; limit ~10. Do not `search_slack` on the parent. |

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
