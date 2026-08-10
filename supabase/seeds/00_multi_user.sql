-- Multi-user demo data for local UI (leaderboard, admin, profiles, memory).
-- Runs on `supabase db reset` and via `pnpm db:seed`.
-- Synthetic accounts use @example.com so they never collide with Workspace Google login.
-- Idempotent: fixed IDs + ON CONFLICT.

-- ---------------------------------------------------------------------------
-- Demo users
-- ---------------------------------------------------------------------------
insert into public."user" (id, name, email, email_verified, image, created_at, updated_at)
values
  (
    'seed_user_alex',
    'Alex Rivera',
    'alex.rivera@example.com',
    true,
    null,
    timestamptz '2026-04-12 09:00:00+00',
    now()
  ),
  (
    'seed_user_sam',
    'Sam Okonkwo',
    'sam.okonkwo@example.com',
    true,
    null,
    timestamptz '2026-05-03 11:30:00+00',
    now()
  ),
  (
    'seed_user_jordan',
    'Jordan Lee',
    'jordan.lee@example.com',
    true,
    null,
    timestamptz '2026-05-20 14:00:00+00',
    now()
  ),
  (
    'seed_user_priya',
    'Priya Shah',
    'priya.shah@example.com',
    true,
    null,
    timestamptz '2026-06-08 08:15:00+00',
    now()
  ),
  (
    'seed_user_morgan',
    'Morgan Blake',
    'morgan.blake@example.com',
    true,
    null,
    timestamptz '2026-06-22 16:45:00+00',
    now()
  )
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  email_verified = excluded.email_verified,
  updated_at = now();

insert into public.user_profiles (user_id, timezone, locale, bio, updated_at)
values
  (
    'seed_user_alex',
    'Europe/London',
    'en-GB',
    'Programme lead — fintech & B2B SaaS cohorts.',
    now()
  ),
  (
    'seed_user_sam',
    'Europe/London',
    'en-GB',
    'Community & Slack ops across Techscaler.',
    now()
  ),
  (
    'seed_user_jordan',
    'Europe/London',
    'en-GB',
    'Ops + knowledge base (Notion / Drive).',
    now()
  ),
  (
    'seed_user_priya',
    'Europe/London',
    'en-GB',
    'New joiner on the delivery team.',
    now()
  ),
  (
    'seed_user_morgan',
    'Europe/London',
    'en-GB',
    'Research-heavy role; bumps into usage caps.',
    now()
  )
on conflict (user_id) do update
set
  timezone = excluded.timezone,
  locale = excluded.locale,
  bio = excluded.bio,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Memory (one block per category where useful)
-- ---------------------------------------------------------------------------
insert into public.user_memory (id, user_id, category, content, source, created_at, updated_at)
values
  (
    'seed_mem_alex_work',
    'seed_user_alex',
    'work_context',
    'Leads Cohort 12 delivery for fintech founders. Works closely with mentors and HubSpot pipeline hygiene.',
    'manual',
    now() - interval '20 days',
    now() - interval '2 days'
  ),
  (
    'seed_mem_alex_focus',
    'seed_user_alex',
    'active_focus',
    'Prep demo day narrative and close open mentor matching gaps before Cohort 13 intake.',
    'agent',
    now() - interval '5 days',
    now() - interval '1 day'
  ),
  (
    'seed_mem_sam_work',
    'seed_user_sam',
    'work_context',
    'Owns Slack community channels and weekly founder office hours.',
    'manual',
    now() - interval '30 days',
    now() - interval '6 days'
  ),
  (
    'seed_mem_jordan_prefs',
    'seed_user_jordan',
    'instructions_preferences',
    'Prefer short bullet answers with Notion/Drive links. Cite source titles, not raw IDs.',
    'import',
    now() - interval '14 days',
    now() - interval '3 days'
  ),
  (
    'seed_mem_morgan_focus',
    'seed_user_morgan',
    'active_focus',
    'Deep research on acquisition channels and competitor landscape for Cohort 12 case studies.',
    'agent',
    now() - interval '8 days',
    now() - interval '1 day'
  )
on conflict (id) do update
set
  content = excluded.content,
  source = excluded.source,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Usage meter (company default + varied spend)
-- ---------------------------------------------------------------------------
insert into public.usage_meter_settings (id, default_limit_usd, updated_at)
values ('default', 10, now())
on conflict (id) do nothing;

insert into public.user_usage_limits (user_id, limit_usd, updated_at)
values
  ('seed_user_morgan', 15, now()),
  ('seed_user_alex', null, now())
on conflict (user_id) do update
set
  limit_usd = excluded.limit_usd,
  updated_at = now();

insert into public.user_usage_periods (user_id, period_key, used_usd, updated_at)
values
  ('seed_user_alex', '2026-08', 4.82, now()),
  ('seed_user_sam', '2026-08', 2.15, now()),
  ('seed_user_jordan', '2026-08', 3.40, now()),
  ('seed_user_priya', '2026-08', 0.35, now()),
  ('seed_user_morgan', '2026-08', 13.90, now())
on conflict (user_id, period_key) do update
set
  used_usd = excluded.used_usd,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Slack links (display-only; no live Slack auth)
-- ---------------------------------------------------------------------------
insert into public.slack_links (
  app_user_id, slack_team_id, slack_user_id, slack_user_name, slack_display_name, slack_email, linked_at
)
values
  (
    'seed_user_sam',
    'T_SEED_CODEBASE',
    'U_SEED_SAM',
    'sam.okonkwo',
    'Sam Okonkwo',
    'sam.okonkwo@example.com',
    now() - interval '40 days'
  ),
  (
    'seed_user_alex',
    'T_SEED_CODEBASE',
    'U_SEED_ALEX',
    'alex.rivera',
    'Alex Rivera',
    'alex.rivera@example.com',
    now() - interval '55 days'
  )
on conflict (slack_team_id, slack_user_id) do update
set
  app_user_id = excluded.app_user_id,
  slack_user_name = excluded.slack_user_name,
  slack_display_name = excluded.slack_display_name,
  slack_email = excluded.slack_email;

-- ---------------------------------------------------------------------------
-- Helper: compact thread state with usage + one tool call
-- ---------------------------------------------------------------------------
create or replace function public._seed_thread_state(
  p_at text,
  p_model text,
  p_user_msg text,
  p_assistant_msg text,
  p_tool_name text,
  p_connection text,
  p_input_tokens int,
  p_output_tokens int,
  p_cost_usd double precision,
  p_call_suffix text
) returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'session', jsonb_build_object('streamIndex', 8),
    'titleMeta', jsonb_build_object(
      'lastUserCount', 1,
      'lastPhase', 'seed',
      'source', 'truncated'
    ),
    'events', jsonb_build_array(
      jsonb_build_object(
        'type', 'session.started',
        'meta', jsonb_build_object('at', p_at),
        'data', jsonb_build_object(
          'runtime', jsonb_build_object(
            'agentId', 'agent-c',
            'modelId', p_model,
            'agentName', 'agent-c',
            'eveVersion', '0.29.2'
          )
        )
      ),
      jsonb_build_object(
        'type', 'turn.started',
        'meta', jsonb_build_object('at', p_at),
        'data', jsonb_build_object('turnId', 'turn_0', 'sequence', 0)
      ),
      jsonb_build_object(
        'type', 'message.received',
        'meta', jsonb_build_object('at', p_at),
        'data', jsonb_build_object(
          'turnId', 'turn_0',
          'sequence', 0,
          'message', p_user_msg,
          'parts', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', p_user_msg)
          )
        )
      ),
      jsonb_build_object(
        'type', 'step.started',
        'meta', jsonb_build_object('at', p_at),
        'data', jsonb_build_object(
          'turnId', 'turn_0',
          'sequence', 0,
          'stepIndex', 0
        )
      ),
      jsonb_build_object(
        'type', 'actions.requested',
        'meta', jsonb_build_object('at', p_at),
        'data', jsonb_build_object(
          'turnId', 'turn_0',
          'sequence', 0,
          'stepIndex', 0,
          'actions', jsonb_build_array(
            jsonb_build_object(
              'kind', 'tool-call',
              'callId', 'call_seed_' || p_call_suffix,
              'toolName', p_tool_name,
              'input', case
                when p_connection is null then '{}'::jsonb
                else jsonb_build_object('connection', p_connection)
              end
            )
          )
        )
      ),
      jsonb_build_object(
        'type', 'action.result',
        'meta', jsonb_build_object('at', p_at),
        'data', jsonb_build_object(
          'turnId', 'turn_0',
          'sequence', 0,
          'stepIndex', 0,
          'status', 'completed',
          'result', jsonb_build_object(
            'kind', 'tool-result',
            'callId', 'call_seed_' || p_call_suffix,
            'toolName', p_tool_name,
            'output', jsonb_build_object('ok', true, 'seed', true)
          )
        )
      ),
      jsonb_build_object(
        'type', 'step.completed',
        'meta', jsonb_build_object('at', p_at),
        'data', jsonb_build_object(
          'turnId', 'turn_0',
          'sequence', 0,
          'stepIndex', 0,
          'finishReason', 'tool-calls',
          'usage', jsonb_build_object(
            'inputTokens', p_input_tokens,
            'outputTokens', p_output_tokens,
            'costUsd', p_cost_usd
          )
        )
      ),
      jsonb_build_object(
        'type', 'step.started',
        'meta', jsonb_build_object('at', p_at),
        'data', jsonb_build_object(
          'turnId', 'turn_0',
          'sequence', 0,
          'stepIndex', 1
        )
      ),
      jsonb_build_object(
        'type', 'message.completed',
        'meta', jsonb_build_object('at', p_at),
        'data', jsonb_build_object(
          'turnId', 'turn_0',
          'sequence', 0,
          'stepIndex', 1,
          'finishReason', 'stop',
          'message', p_assistant_msg
        )
      ),
      jsonb_build_object(
        'type', 'step.completed',
        'meta', jsonb_build_object('at', p_at),
        'data', jsonb_build_object(
          'turnId', 'turn_0',
          'sequence', 0,
          'stepIndex', 1,
          'finishReason', 'stop',
          'usage', jsonb_build_object(
            'inputTokens', greatest(200, p_input_tokens / 4),
            'outputTokens', greatest(120, p_output_tokens / 2),
            'costUsd', round((p_cost_usd * 0.35)::numeric, 4)::float8
          )
        )
      ),
      jsonb_build_object(
        'type', 'turn.completed',
        'meta', jsonb_build_object('at', p_at),
        'data', jsonb_build_object('turnId', 'turn_0', 'sequence', 0)
      )
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Threads with usage (powers leaderboard / admin charts)
-- ---------------------------------------------------------------------------
insert into public.threads (id, user_id, title, state, created_at, updated_at)
values
  (
    'seed_thread_alex_1',
    'seed_user_alex',
    'HubSpot pipeline for Cohort 12',
    public._seed_thread_state(
      '2026-08-04T10:15:00.000Z',
      'openai/gpt-5.6-luna',
      'Which Cohort 12 companies have stale deals in HubSpot?',
      'Pulled open deals older than 30 days — three companies need a chase this week.',
      'hubspot__search_crm_objects',
      'hubspot',
      8200,
      2100,
      0.42,
      'alex_hs_1'
    ),
    timestamptz '2026-08-04 10:15:00+00',
    timestamptz '2026-08-04 10:18:00+00'
  ),
  (
    'seed_thread_alex_2',
    'seed_user_alex',
    'Demo day talking points',
    public._seed_thread_state(
      '2026-08-08T15:40:00.000Z',
      'xai/grok-4.5',
      'Draft talking points for the three strongest Cohort 12 stories.',
      'Here are concise talking points for Northbank, Lattice Health, and Harbor Logistics.',
      'search_drive',
      null,
      12400,
      3600,
      0.91,
      'alex_drive_1'
    ),
    timestamptz '2026-08-08 15:40:00+00',
    timestamptz '2026-08-08 15:46:00+00'
  ),
  (
    'seed_thread_sam_1',
    'seed_user_sam',
    'Office hours recap from Slack',
    public._seed_thread_state(
      '2026-08-05T09:05:00.000Z',
      'openai/gpt-5.6-luna',
      'Summarise yesterday''s #office-hours thread.',
      'Four founders asked about pricing; two want intro to mentors in hardware.',
      'search_slack',
      null,
      5400,
      1600,
      0.28,
      'sam_slack_1'
    ),
    timestamptz '2026-08-05 09:05:00+00',
    timestamptz '2026-08-05 09:08:00+00'
  ),
  (
    'seed_thread_sam_2',
    'seed_user_sam',
    'Channel health check',
    public._seed_thread_state(
      '2026-08-09T12:20:00.000Z',
      'openai/gpt-5.4-nano',
      'Which Slack channels went quiet this month?',
      '#hardware-founders and #life-sciences are the quietest; suggest a nudge post.',
      'search_slack',
      null,
      2100,
      700,
      0.06,
      'sam_slack_2'
    ),
    timestamptz '2026-08-09 12:20:00+00',
    timestamptz '2026-08-09 12:22:00+00'
  ),
  (
    'seed_thread_jordan_1',
    'seed_user_jordan',
    'Notion playbook lookup',
    public._seed_thread_state(
      '2026-08-03T11:00:00.000Z',
      'openai/gpt-5.6-luna',
      'Find the mentor pairing playbook in Notion.',
      'Found "Mentor pairing v3" — link and a short summary of the 10-day target.',
      'notion__search',
      'notion',
      6100,
      1800,
      0.33,
      'jordan_notion_1'
    ),
    timestamptz '2026-08-03 11:00:00+00',
    timestamptz '2026-08-03 11:04:00+00'
  ),
  (
    'seed_thread_jordan_2',
    'seed_user_jordan',
    'Recent Drive decks',
    public._seed_thread_state(
      '2026-08-07T16:10:00.000Z',
      'openai/gpt-5.6-luna',
      'List recent investor update decks in Drive.',
      'Three decks from the last fortnight; Harbor''s is the freshest.',
      'list_recent_drive',
      null,
      4300,
      1100,
      0.19,
      'jordan_drive_1'
    ),
    timestamptz '2026-08-07 16:10:00+00',
    timestamptz '2026-08-07 16:13:00+00'
  ),
  (
    'seed_thread_priya_1',
    'seed_user_priya',
    'What can Agent C do?',
    public._seed_thread_state(
      '2026-08-06T08:30:00.000Z',
      'openai/gpt-5.4-nano',
      'Quick tour of what I should use you for in my first week.',
      'Start with Slack search, HubSpot company lookups, and saving preferences to memory.',
      'save_memory',
      null,
      900,
      400,
      0.02,
      'priya_mem_1'
    ),
    timestamptz '2026-08-06 08:30:00+00',
    timestamptz '2026-08-06 08:31:00+00'
  ),
  (
    'seed_thread_morgan_1',
    'seed_user_morgan',
    'Competitive landscape deep dive',
    public._seed_thread_state(
      '2026-08-02T13:00:00.000Z',
      'xai/grok-4.5',
      'Research competing accelerators and synthesise a long brief.',
      'Long brief saved — covering programmes, terms, and geography overlap.',
      'web_search',
      null,
      28000,
      9200,
      3.40,
      'morgan_web_1'
    ),
    timestamptz '2026-08-02 13:00:00+00',
    timestamptz '2026-08-02 13:25:00+00'
  ),
  (
    'seed_thread_morgan_2',
    'seed_user_morgan',
    'Platform workspace companies',
    public._seed_thread_state(
      '2026-08-09T19:05:00.000Z',
      'anthropic/claude-sonnet-5',
      'Pull Cohort 12 company records from Platform.',
      'Listed active companies with sector tags; flagged two missing website fields.',
      'platform__search',
      'platform',
      15600,
      4800,
      1.85,
      'morgan_plat_1'
    ),
    timestamptz '2026-08-09 19:05:00+00',
    timestamptz '2026-08-09 19:20:00+00'
  ),
  (
    'seed_thread_morgan_3',
    'seed_user_morgan',
    'Tally NPS export notes',
    public._seed_thread_state(
      '2026-08-10T09:40:00.000Z',
      'openai/gpt-5.6-luna',
      'Summarise the latest founder NPS form responses from Tally.',
      'NPS +41; top praise is mentor quality, top ask is faster pairing.',
      'tally__list_submissions',
      'tally',
      7200,
      2400,
      0.55,
      'morgan_tally_1'
    ),
    timestamptz '2026-08-10 09:40:00+00',
    timestamptz '2026-08-10 09:48:00+00'
  )
on conflict (id) do update
set
  user_id = excluded.user_id,
  title = excluded.title,
  state = excluded.state,
  updated_at = excluded.updated_at;

-- ---------------------------------------------------------------------------
-- Thread feedback
-- ---------------------------------------------------------------------------
insert into public.thread_feedback (
  id, thread_id, user_id, rating, comment, message_id, created_at, updated_at
)
values
  (
    'seed_fb_alex_1',
    'seed_thread_alex_1',
    'seed_user_alex',
    'good',
    'Accurate deal ages — saved me a HubSpot click-fest.',
    null,
    timestamptz '2026-08-04 10:20:00+00',
    timestamptz '2026-08-04 10:20:00+00'
  ),
  (
    'seed_fb_sam_1',
    'seed_thread_sam_1',
    'seed_user_sam',
    'good',
    null,
    null,
    timestamptz '2026-08-05 09:10:00+00',
    timestamptz '2026-08-05 09:10:00+00'
  ),
  (
    'seed_fb_morgan_1',
    'seed_thread_morgan_1',
    'seed_user_morgan',
    'bad',
    'Too long and a few outdated programme names.',
    null,
    timestamptz '2026-08-02 13:30:00+00',
    timestamptz '2026-08-02 13:30:00+00'
  )
on conflict (id) do update
set
  rating = excluded.rating,
  comment = excluded.comment,
  updated_at = excluded.updated_at;

-- ---------------------------------------------------------------------------
-- Extra artifacts owned by demo users (visible on their profiles / lists)
-- ---------------------------------------------------------------------------
insert into public.artifacts (
  id, author_id, thread_id, type, title, content_markdown, status, colour, metadata, created_at, updated_at
)
values
  (
    'seed_art_alex_1',
    'seed_user_alex',
    'seed_thread_alex_2',
    'note',
    'Demo day talking points (draft)',
    $md$# Demo day talking points

## Northbank Payments
ICP narrowed to mid-market lenders; MRR 18k → 74k.

## Lattice Health
Strong mentor engagement; still needing manufacturing intros.

## Harbor Logistics
Partner channel grew fastest in June — worth a Cohort 13 playbook.
$md$,
    'draft',
    'peach',
    '{"cohort":"Cohort 12"}'::jsonb,
    timestamptz '2026-08-08 15:46:00+00',
    timestamptz '2026-08-08 15:46:00+00'
  ),
  (
    'seed_art_jordan_1',
    'seed_user_jordan',
    'seed_thread_jordan_1',
    'summary',
    'Mentor pairing playbook — TL;DR',
    $md$# Mentor pairing playbook

Target: first mentor session within **10 days** of intake.

Current median is **23 days**. Bottlenecks: hardware + life-sciences mentor supply.
$md$,
    'published',
    'green',
    '{"source":"Notion"}'::jsonb,
    timestamptz '2026-08-03 11:04:00+00',
    timestamptz '2026-08-03 11:04:00+00'
  )
on conflict (id) do update
set
  author_id = excluded.author_id,
  thread_id = excluded.thread_id,
  title = excluded.title,
  content_markdown = excluded.content_markdown,
  status = excluded.status,
  colour = excluded.colour,
  metadata = excluded.metadata,
  updated_at = excluded.updated_at;

drop function if exists public._seed_thread_state(
  text, text, text, text, text, text, int, int, double precision, text
);
