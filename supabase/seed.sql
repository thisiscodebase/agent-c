-- Local dev seed (signed-in account artifacts + sample chat).
-- Runs after ./seeds/00_multi_user.sql on `supabase db reset` / `pnpm db:seed`.
-- Everything here is idempotent and attaches to a real signed-in account where
-- one exists, so a reset against an empty database is a no-op rather than an
-- error. Artifacts are author-scoped, so seeding the wrong account makes them
-- invisible in the UI — hence the preference for non-placeholder emails.

insert into public.artifacts (
  id, author_id, type, title, content_markdown, status, colour, metadata
)
select
  seed.id,
  u.id,
  seed.type,
  seed.title,
  seed.content_markdown,
  seed.status,
  seed.colour,
  seed.metadata
from (values
  (
    'a1000000-0000-4000-8000-000000000001',
    'case_study',
    'Fintech scale-up: from seed to Series A in 14 months',
    $md$# Summary

A Glasgow-based payments startup joined the accelerator at pre-seed and closed a
Series A within 14 months. The work centred on three interventions: sharpening
the ICP, rebuilding the outbound motion, and introducing a weekly metrics ritual.

## Background

The team arrived with a working product and roughly £18k MRR, but a scattered
customer base spanning four unrelated verticals. Sales cycles were long and
inconsistent, and the founders could not articulate which segment paid fastest.

## Interventions

### 1. Narrowing the ICP

We ran a cohort analysis across 60 existing accounts. Mid-market lenders showed
half the sales cycle and roughly triple the expansion revenue of every other
segment. The team dropped two verticals outright.

### 2. Rebuilding outbound

Messaging was rewritten around the lender pain point. Reply rates moved from
under 2% to a little over 9% across the following quarter.

### 3. Weekly metrics ritual

A single dashboard, reviewed every Monday, covering pipeline, activation, and
net revenue retention.

## Results

| Metric | Before | After |
| --- | --- | --- |
| MRR | £18k | £74k |
| Sales cycle | 96 days | 41 days |
| Net revenue retention | 91% | 118% |

## What we would do differently

Narrowing the ICP should have happened in month one. The team spent roughly a
quarter servicing accounts they later walked away from.
$md$,
    'draft',
    'peach',
    '{"customer":"Northbank Payments","sector":"Fintech","interventions":["ICP definition","Outbound rebuild","Metrics cadence"]}'::jsonb
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'report',
    'Q3 programme overview: cohort health and delivery',
    $md$# Q3 programme overview

Cohort 12 reached the midpoint with stronger engagement than Cohort 11, though
mentor matching remains the weakest part of delivery.

## Cohort health

- **28 companies** active, down from 31 at intake (three voluntary withdrawals)
- **86%** attended four or more of the six core sessions
- Founder NPS of **+41**, up from +28 in Q2

## Delivery notes

Mentor pairing continues to be the bottleneck. Median time from intake to first
mentor session was 23 days against a 10-day target, driven mostly by mentor
availability in the hardware and life-sciences tracks.

## Recommendations

1. Recruit mentors in the two thin tracks before Cohort 13 intake.
2. Move pairing ahead of the first workshop rather than running in parallel.
3. Replace the intake survey's free-text goals field with a structured picker so
   pairing can be partly automated.

## Open questions

Whether the three withdrawals share a cause is still unclear — exit interviews
were only completed for one of them.
$md$,
    'published',
    'white',
    '{"period":"Q3","cohort":"Cohort 12","companies":28}'::jsonb
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'summary',
    'Mentor feedback themes, June to July',
    $md$# Mentor feedback themes

Across 34 mentor session notes from June and July, three themes recur often
enough to act on.

## 1. Founders arrive without a specific ask

Mentors repeatedly describe the first session as "orientation" rather than
advice. Roughly half of notes mention time spent establishing context that a
pre-read could have covered.

## 2. Financial modelling is the most requested follow-up

Fourteen of the 34 notes end with an offer to review a model. Only four of those
reviews appear to have happened, suggesting the follow-up path is unclear.

## 3. Hardware founders feel under-served

Four of the five hardware companies mention wanting a mentor with manufacturing
experience. This matches the pairing delay reported in the Q3 overview.

## Suggested actions

- Require a one-page brief before the first mentor session.
- Create a standing financial-modelling clinic instead of ad-hoc reviews.
- Prioritise hardware mentor recruitment.
$md$,
    'draft',
    'green',
    '{"sources":34,"period":"June-July"}'::jsonb
  ),
  (
    'a1000000-0000-4000-8000-000000000004',
    'note',
    'Demo day venue options',
    $md$# Demo day venue options

Three venues shortlisted for the Cohort 12 demo day, all available the week of
the target date.

| Venue | Capacity | Cost | Notes |
| --- | --- | --- | --- |
| Barras Art and Design | 220 | £1,900 | Strong AV, awkward parking |
| Civic House | 150 | £1,200 | Cheapest, likely too small |
| The Engine Works | 300 | £2,650 | Best space, over budget |

Leaning towards Barras Art and Design: capacity is comfortable for the expected
180 guests, and the AV setup means no separate hire.

Open question — whether the investor contingent is closer to 40 or 70 changes
whether Civic House is viable at all.
$md$,
    'draft',
    'lilac',
    '{"cohort":"Cohort 12"}'::jsonb
  ),
  (
    'a1000000-0000-4000-8000-000000000005',
    'report',
    'Acquisition channels: Q2 performance',
    $md$A look at how Cohort 12 companies found their first ten customers, based on
founder interviews and HubSpot deal sources.

## Pipeline by month

Outbound rebuilt messaging mid-April; inbound stayed flat while partner
referrals stepped up in June.

```chart
{
  "type": "area",
  "title": "Qualified opportunities by month",
  "xKey": "month",
  "series": [
    { "key": "outbound", "label": "Outbound" },
    { "key": "inbound", "label": "Inbound" },
    { "key": "partner", "label": "Partner" }
  ],
  "data": [
    { "month": "Jan", "outbound": 4, "inbound": 6, "partner": 1 },
    { "month": "Feb", "outbound": 5, "inbound": 5, "partner": 2 },
    { "month": "Mar", "outbound": 7, "inbound": 7, "partner": 2 },
    { "month": "Apr", "outbound": 12, "inbound": 6, "partner": 3 },
    { "month": "May", "outbound": 18, "inbound": 8, "partner": 4 },
    { "month": "Jun", "outbound": 21, "inbound": 7, "partner": 9 }
  ]
}
```

## Mix of closed-won

Outbound now accounts for just over half of closed-won deals in the half.

```chart
{
  "type": "pie",
  "title": "Closed-won by channel (H1)",
  "nameKey": "channel",
  "valueKey": "deals",
  "data": [
    { "channel": "Outbound", "deals": 19 },
    { "channel": "Inbound", "deals": 11 },
    { "channel": "Partner", "deals": 8 }
  ]
}
```

## Takeaways

1. The April outbound rewrite is the clearest inflection in the series.
2. Partner is still small in absolute terms but grew fastest into June — worth
   a dedicated playbook before Cohort 13.
3. Inbound volume has not moved; treat it as a brand/content problem rather than
   a sales-capacity one.
$md$,
    'published',
    'peach',
    '{"period":"H1","cohort":"Cohort 12","charts":["area","pie"]}'::jsonb
  )
) as seed (id, type, title, content_markdown, status, colour, metadata)
cross join (
  select id
  from public."user"
  order by (email like '%@example.com') asc, created_at asc
  limit 1
) as u
on conflict (id) do nothing;

-- Chat with an inline create_artifact card pointing at the acquisition-channels
-- report. History is Eve stream events in threads.state (there is no messages table).
-- Display-only: no live Eve session cursor, so continuing the chat starts fresh.
insert into public.threads (id, user_id, title, state)
select
  't1000000-0000-4000-8000-000000000001',
  u.id,
  'Acquisition channels report',
  $state${
  "session": { "streamIndex": 11 },
  "titleMeta": { "lastUserCount": 1, "lastPhase": "seed", "source": "truncated" },
  "events": [
    {
      "type": "session.started",
      "meta": { "at": "2026-07-31T15:00:00.000Z" },
      "data": {
        "runtime": {
          "agentId": "agent-c",
          "modelId": "openai/gpt-5.4-mini",
          "agentName": "agent-c",
          "eveVersion": "0.29.2"
        }
      }
    },
    {
      "type": "turn.started",
      "meta": { "at": "2026-07-31T15:00:00.050Z" },
      "data": { "turnId": "turn_0", "sequence": 0 }
    },
    {
      "type": "message.received",
      "meta": { "at": "2026-07-31T15:00:00.050Z" },
      "data": {
        "turnId": "turn_0",
        "sequence": 0,
        "message": "Can you pull together a short report on how Cohort 12 companies found their first customers, with charts if you have the numbers?",
        "parts": [
          {
            "type": "text",
            "text": "Can you pull together a short report on how Cohort 12 companies found their first customers, with charts if you have the numbers?"
          }
        ]
      }
    },
    {
      "type": "step.started",
      "meta": { "at": "2026-07-31T15:00:00.100Z" },
      "data": { "turnId": "turn_0", "sequence": 0, "stepIndex": 0 }
    },
    {
      "type": "actions.requested",
      "meta": { "at": "2026-07-31T15:00:01.000Z" },
      "data": {
        "turnId": "turn_0",
        "sequence": 0,
        "stepIndex": 0,
        "actions": [
          {
            "kind": "tool-call",
            "callId": "call_seed_create_artifact_1",
            "toolName": "create_artifact",
            "input": {
              "type": "report",
              "title": "Acquisition channels: Q2 performance",
              "contentMarkdown": "A look at how Cohort 12 companies found their first ten customers…",
              "metadata": { "period": "H1", "cohort": "Cohort 12" }
            }
          }
        ]
      }
    },
    {
      "type": "action.result",
      "meta": { "at": "2026-07-31T15:00:01.200Z" },
      "data": {
        "turnId": "turn_0",
        "sequence": 0,
        "stepIndex": 0,
        "status": "completed",
        "result": {
          "kind": "tool-result",
          "callId": "call_seed_create_artifact_1",
          "toolName": "create_artifact",
          "output": {
            "id": "a1000000-0000-4000-8000-000000000005",
            "type": "report",
            "title": "Acquisition channels: Q2 performance",
            "status": "published",
            "colour": "peach",
            "preview": "A look at how Cohort 12 companies found their first ten customers, based on\nfounder interviews and HubSpot deal sources.\n\n## Pipeline by month\n\nOutbound rebuilt messaging mid-April; inbound stayed flat while partner\nreferrals stepped up in June.\n\n\n*(Qualified opportunities by month)*\n\n\n## Mix of closed-won\n\nOutbound now accounts for just over half of closed-won deals in the half.\n\n\n*(Closed-won by channel (H1))*\n\n\n## Takeaways\n\n1. The April outbound rewrite is the clearest inflection in the series.\n2. Partner is still small in absolute terms but grew fastest into June — worth\n   a dedicated playbook before Cohort 13.\n3. Inbound volume has not moved; treat it as a brand/content problem rather than\n   a sales-capacity one."
          }
        }
      }
    },
    {
      "type": "step.completed",
      "meta": { "at": "2026-07-31T15:00:01.250Z" },
      "data": {
        "turnId": "turn_0",
        "sequence": 0,
        "stepIndex": 0,
        "finishReason": "tool-calls"
      }
    },
    {
      "type": "step.started",
      "meta": { "at": "2026-07-31T15:00:01.300Z" },
      "data": { "turnId": "turn_0", "sequence": 0, "stepIndex": 1 }
    },
    {
      "type": "message.completed",
      "meta": { "at": "2026-07-31T15:00:02.000Z" },
      "data": {
        "turnId": "turn_0",
        "sequence": 0,
        "stepIndex": 1,
        "finishReason": "stop",
        "message": "Saved the acquisition channels report as an artifact — open the card to review the charts."
      }
    },
    {
      "type": "step.completed",
      "meta": { "at": "2026-07-31T15:00:02.050Z" },
      "data": {
        "turnId": "turn_0",
        "sequence": 0,
        "stepIndex": 1,
        "finishReason": "stop"
      }
    },
    {
      "type": "turn.completed",
      "meta": { "at": "2026-07-31T15:00:02.100Z" },
      "data": { "turnId": "turn_0", "sequence": 0 }
    }
  ]
}$state$::jsonb
from (
  select id
  from public."user"
  order by (email like '%@example.com') asc, created_at asc
  limit 1
) as u
on conflict (id) do update
set
  title = excluded.title,
  state = excluded.state,
  user_id = excluded.user_id,
  updated_at = now();

update public.artifacts
set thread_id = 't1000000-0000-4000-8000-000000000001'
where id = 'a1000000-0000-4000-8000-000000000005'
  and exists (
    select 1 from public.threads
    where id = 't1000000-0000-4000-8000-000000000001'
  );
