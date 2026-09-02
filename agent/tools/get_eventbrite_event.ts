import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  EventbriteError,
  eventNotFoundResult,
  getEventbriteApiKey,
  getEventbriteEvent,
} from "../lib/eventbrite-api.js";

/**
 * Eventbrite single-event detail + attendance counts.
 *
 * @see https://www.eventbrite.com/platform/api#/reference/event/retrieve
 */
export default defineTool({
  description:
    "Get one Eventbrite event by id: venue, ticket classes, quantity_sold, registered count, and attending/checked-in count (Eventbrite status=attending). Prefer list_eventbrite_events first. Cite url. Attendance.attending is door check-in-or-attending, not tickets sold.",
  inputSchema: z.object({
    event_id: z
      .string()
      .min(1)
      .describe("Eventbrite event id from list_eventbrite_events or an event URL."),
  }),
  async execute({ event_id }) {
    const apiKey = getEventbriteApiKey();
    try {
      return await getEventbriteEvent(apiKey, event_id);
    } catch (error) {
      if (error instanceof EventbriteError && error.status === 404) {
        return eventNotFoundResult(event_id);
      }
      throw error;
    }
  },
});
