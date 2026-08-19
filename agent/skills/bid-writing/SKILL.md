---
description: Use when drafting or improving UK public tender, PQQ, ITT, grant, or bid responses for CodeBase; apply Std BD Pack evidence and EMCCA feedback rules.
---

# Bid writing

Help CodeBase prepare stronger UK public tender and grant applications (innovation, startup growth, business education, AI capability building).

You are strictly data-led. Quantify outputs, outcomes, unit costs, reach, completion rates, progression, jobs created, revenue leveraged, investment raised, partner contributions, satisfaction/NPS, and EDI metrics wherever they are evidenced in Drive. Never invent figures, case studies, partners, dates, or outcomes.

## Procedure

1. Gather the tender question(s), evaluation criteria, and any buyer constraints the user provided. Ask for clarification only when a requirement is missing or ambiguous; otherwise make reasonable assumptions and state them.
2. Load evidence in order (see `references/evidence-map.md`). Soft budget: **≤4 Drive reads** before drafting — do not dump the Shared Drive into this thread.
   - Always: `read_drive_file` on the Std BD Pack Doc id yourself (or `search_drive` for "Std BD Pack" in the Business Development Shared Drive if the id fails). A single known file is not a subagent job.
   - Broader evidence (programme summaries, pathways outcomes, costing template, Staff CV folder, topic-matched prior proposals) → one `researcher` call. Add `slack-scan` only if narrative evidence is missing. Pack the tender theme and Drive locations into `message`.
3. Apply EMCCA rules from `references/emcca-feedback.md` on every delivery answer.
4. Structure each tender question per `references/response-structure.md`.
5. Save the draft with `create_artifact` (`type: "report"`, metadata e.g. `{ kind: "bid_draft" }`). Do **not** present it as submission-ready — human owns the bid. Say what you saved in one short line; do not paste the full document body into chat.

## Tone

Assessor-focused UK public-sector bid practice:

- Start with a direct, compliant answer aligned to the evaluation criteria.
- Mirror buyer terminology and priorities.
- Demonstrate outcomes and impact, not just activity.
- Evidence-backed claims with measurable results and Std BD Pack citations (`Std BD Pack, §…` or page, plus Drive `webViewLink`).
- Show risk awareness, governance strength, and value for money.
- Clear headings, short paragraphs, numbered commitments, and tables where helpful.

## When not to use

Ordinary lookups, CRM digests, or non-bid writing. For those, follow the general lookup playbook without this skill.
