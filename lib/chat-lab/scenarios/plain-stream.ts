import { beginTurn, endTurn } from "../dsl.ts";
import type { ChatLabScenario } from "../types.ts";

const userMessage = "Give me a short status update on Acme.";

export const plainStreamScenario: ChatLabScenario = {
  id: "plain-stream",
  label: "Plain stream",
  description: "User send → thinking → streamed markdown answer",
  userMessage,
  events: endTurn(
    beginTurn(userMessage).streamText(
      `**Acme is on track this week.** Mentorship sessions are filling, and the renewal conversation is still scheduled for Thursday.

- 6 sessions already booked, two more pending confirmation
- NPS sitting at 72 — no new detractors since the last QBR
- Open risk is thin mentor coverage in March; Sam is chasing two backups

I’ll flag it again if those backup mentors don’t confirm by Friday.`,
    ),
  ),
};
