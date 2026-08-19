import { beginTurn, endTurn } from "../dsl.ts";
import type { ChatLabScenario } from "../types.ts";

const userMessage =
  "Give me the full picture on Acme — CRM, Drive, Slack, Asana, Notion, Tally, Platform.";

export const reasoningToolsScenario: ChatLabScenario = {
  id: "reasoning-tools",
  label: "Reasoning + tools",
  description: "Multiple connector batches with reasoning between them",
  userMessage,
  events: endTurn(
    beginTurn(userMessage)
      .streamReasoning(
        "## Sweeping sources\nI’ll pull CRM, Drive, and Slack in parallel first so we have the commercial picture before delivery tools.",
      )
      .toolBatch([
        {
          toolName: "hubspot__search_crm",
          input: { query: "Acme", object: "companies" },
          output: {
            results: [
              {
                name: "Acme Corp",
                stage: "Customer",
                owner: "Sam Rivera",
                lastActivity: "2026-01-12",
              },
            ],
          },
        },
        {
          toolName: "search_drive",
          input: { query: "Acme QBR" },
          output: {
            files: [
              { name: "Acme QBR notes.docx", modified: "2026-01-10" },
              { name: "Acme mentorship coverage.xlsx", modified: "2026-01-08" },
            ],
          },
        },
        {
          toolName: "search_slack",
          input: { query: "Acme renewal after:2026-01-01" },
          output: {
            matches: [
              { channel: "#accounts", text: "Thursday renewal call still on" },
              { channel: "#mentors", text: "March coverage still thin" },
            ],
          },
        },
      ])
      .nextStep()
      .streamReasoning(
        "## Delivery systems\nCRM/Slack agree on Thursday. Next: Asana tasks, Notion brief, and Tally responses.",
      )
      .toolBatch([
        {
          toolName: "asana__search_tasks",
          input: { query: "Acme incomplete due this week" },
          output: {
            tasks: [
              { name: "Confirm March backup mentors", due: "Friday" },
              { name: "Send Thursday agenda", due: "Tomorrow" },
            ],
          },
        },
        {
          toolName: "notion__search",
          input: { query: "Acme product brief" },
          output: {
            pages: [{ title: "Acme Q1 brief", openQuestions: 3 }],
          },
        },
        {
          toolName: "tally__list_responses",
          input: { form: "mentor-availability" },
          output: {
            newest: 4,
            outliers: ["two mentors marked unavailable all of March"],
          },
        },
      ])
      .nextStep()
      .streamReasoning(
        "## Platform check\nLast pass: CodeBase Platform bookings plus a quick web check that nothing public contradicts this.",
      )
      .toolBatch([
        {
          toolName: "platform__list_sessions",
          input: { company: "Acme", week: "this" },
          output: { booked: 6, pending: 2 },
        },
        {
          toolName: "web_search",
          input: { query: "Acme Corp mentorship news" },
          output: { hits: [{ title: "No material public updates this week" }] },
        },
      ])
      .nextStep()
      .streamReasoning(
        "## Drafting answer\nEight tools across three batches. I’ll synthesise stage, delivery risk, and what to do before Thursday.",
      )
      .streamText(
        `**Acme is a Customer**, owned by Sam Rivera. Thursday’s renewal call is still on — Slack and HubSpot agree.

Delivery is the risk, not the commercial relationship:

- Platform: 6 sessions booked this week, 2 pending
- Asana: backup-mentor task still open for Friday
- Tally: two mentors unavailable for all of March
- Notion brief still has 3 open questions from the 10 Jan QBR

Nothing public contradicts this. Chase the March coverage before the call and Acme stays boring in a good way.`,
      ),
  ),
};
