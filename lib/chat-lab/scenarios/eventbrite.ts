import { beginTurn, endTurn } from "../dsl.ts";
import type { ChatLabScenario } from "../types.ts";

const userMessage =
  "What's the average number of attendees at Unfiltered, per location, for 2026 so far?";

export const eventbriteScenario: ChatLabScenario = {
  id: "eventbrite",
  label: "Eventbrite",
  description: "Lists Unfiltered events and averages signups by venue city",
  userMessage,
  events: endTurn(
    beginTurn(userMessage)
      .streamReasoning(
        "## Unfiltered 2026\nList org events named Unfiltered, then average quantity_sold by venue city. Signups, not door check-in.",
      )
      .toolBatch([
        {
          toolName: "list_eventbrite_events",
          input: {
            name_filter: "Unfiltered",
            time_filter: "past",
            start_date: "2026-01-01T00:00:00Z",
          },
          output: {
            events: [
              {
                id: "111",
                name: "Unfiltered Edinburgh",
                start: { utc: "2026-02-04T18:00:00Z" },
                venue: { name: "CodeBase Edinburgh", city: "Edinburgh" },
                quantity_sold: 42,
                url: "https://www.eventbrite.com/e/unfiltered-edinburgh-tickets-111",
              },
              {
                id: "222",
                name: "Unfiltered Stirling",
                start: { utc: "2026-03-11T18:00:00Z" },
                venue: { name: "CodeBase Stirling", city: "Stirling" },
                quantity_sold: 28,
                url: "https://www.eventbrite.com/e/unfiltered-stirling-tickets-222",
              },
              {
                id: "333",
                name: "Unfiltered Edinburgh",
                start: { utc: "2026-04-08T18:00:00Z" },
                venue: { name: "CodeBase Edinburgh", city: "Edinburgh" },
                quantity_sold: 38,
                url: "https://www.eventbrite.com/e/unfiltered-edinburgh-tickets-333",
              },
            ],
          },
        },
      ])
      .nextStep()
      .streamReasoning(
        "## Averages\nEdinburgh 40 signups (42+38)/2; Stirling 28. These are tickets sold, not check-ins.",
      )
      .streamText(
        `Average Unfiltered signups in 2026 so far (tickets sold, not door check-in):

- **Edinburgh** — 40 ([Feb](https://www.eventbrite.com/e/unfiltered-edinburgh-tickets-111), [Apr](https://www.eventbrite.com/e/unfiltered-edinburgh-tickets-333))
- **Stirling** — 28 ([Mar](https://www.eventbrite.com/e/unfiltered-stirling-tickets-222))`,
      ),
  ),
};
