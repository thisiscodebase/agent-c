import { beginTurn, endTurn } from "../dsl.ts";
import type { ChatLabScenario } from "../types.ts";

const userMessage =
  "Fan this out — research, CRM, Slack, and platform — then tell me what actually matters for Acme.";

export const subagentScenario: ChatLabScenario = {
  id: "subagent",
  label: "Subagent",
  description: "Several subagents in flight, finishing at different times",
  userMessage,
  events: endTurn(
    beginTurn(userMessage)
      .streamReasoning(
        "## Sharing the work\nThis is too wide for one pass. I’ll spin up four subagents: docs, CRM, Slack, and platform. They’ll finish on different clocks.",
      )
      .subagentBatch([
        {
          name: "docs-research",
          task: "Read the latest Acme QBR and coverage notes in Drive/Notion.",
          result:
            "QBR 10 Jan still current. Coverage risk called out for March. Three open questions in the Notion brief.",
        },
        {
          name: "crm-research",
          task: "Pull HubSpot company, owner, and latest deal activity for Acme.",
          result:
            "Customer stage. Owner Sam Rivera. Last activity 12 Jan. Renewal meeting Thursday.",
        },
        {
          name: "platform-research",
          task: "Check CodeBase Platform bookings and pairing gaps for Acme this week.",
          result: "6 sessions booked, 2 pending. Pairing gap opens in March.",
        },
        {
          name: "slack-scan",
          task: "Search Slack for Acme renewal and mentor coverage decisions this month.",
          result:
            "#accounts: Thursday call still on. #mentors: March coverage still thin; nobody confirmed backups.",
        },
      ])
      .nextStep()
      .streamReasoning(
        "## Merging results\nDocs and CRM landed first, platform next, Slack last. They agree: commercially fine, operationally thin in March.",
      )
      .streamText(
        `Four subagents, one picture:

**Fine:** Customer, Sam Rivera, Thursday renewal still in the diary.
**Not fine:** March mentor coverage. Docs, platform, and Slack all independently flagged it; backups are still unconfirmed.

If you only chase one thing before Thursday, chase those two pending sessions and the backup-mentor Asana task.`,
      ),
  ),
};
