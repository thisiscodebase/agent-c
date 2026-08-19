import { beginTurn, endTurn } from "../dsl.ts";
import type { ChatLabScenario } from "../types.ts";

const userMessage =
  "Fan this out — research and Slack — then tell me what actually matters for Acme.";

export const subagentScenario: ChatLabScenario = {
  id: "subagent",
  label: "Subagent",
  description: "Researcher and Slack scan in flight, finishing at different times",
  userMessage,
  events: endTurn(
    beginTurn(userMessage)
      .streamReasoning(
        "## Sharing the work\nThis is too wide for one pass. I’ll spin up researcher and slack-scan. They’ll finish on different clocks.",
      )
      .subagentBatch([
        {
          name: "researcher",
          task: "Look up Acme in HubSpot, Platform, Drive, and Notion: company, owner, bookings, and the latest QBR / coverage notes.",
          result:
            "Customer stage. Owner Sam Rivera. QBR 10 Jan still current. 6 sessions booked, 2 pending. Coverage risk in March; three open questions in the Notion brief.",
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
        "## Merging results\nResearcher landed first, Slack last. They agree: commercially fine, operationally thin in March.",
      )
      .streamText(
        `Two specialists, one picture:

**Fine:** Customer, Sam Rivera, Thursday renewal still in the diary.
**Not fine:** March mentor coverage. Docs, platform, and Slack all independently flagged it; backups are still unconfirmed.

If you only chase one thing before Thursday, chase those two pending sessions and the backup-mentor Asana task.`,
      ),
  ),
};
