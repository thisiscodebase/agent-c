import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  EventbriteError,
  eventNotFoundResult,
  getEventbriteApiKey,
  listEventbriteAttendees,
} from "../lib/eventbrite-api.js";

/**
 * Eventbrite per-event attendee roster (PII: name + email).
 *
 * @see https://www.eventbrite.com/platform/docs/attendees
 */
export default defineTool({
  description:
    "List attendees for one Eventbrite event (name, email, status, checked_in, ticket class). status=attending means attending or checked in. Optional query filters this page by name or email (API has no name search). Do not dump a full roster unless the user asked. Paginate with continuation.",
  inputSchema: z.object({
    event_id: z
      .string()
      .min(1)
      .describe("Eventbrite event id from list_eventbrite_events."),
    status: z
      .enum(["attending", "not_attending", "unpaid"])
      .optional()
      .describe(
        "attending = attending or checked in; not_attending = not attending or deleted; unpaid = unpaid order.",
      ),
    query: z
      .string()
      .min(1)
      .optional()
      .describe("Filter this page by attendee name or email (case-insensitive substring)."),
    continuation: z
      .string()
      .min(1)
      .optional()
      .describe("Pagination token from a previous list_eventbrite_attendees call."),
    page_size: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Page size (1–50). Defaults to 50."),
  }),
  async execute({ event_id, status, query, continuation, page_size }) {
    const apiKey = getEventbriteApiKey();
    try {
      return await listEventbriteAttendees(apiKey, event_id, {
        status,
        query,
        continuation,
        page_size,
      });
    } catch (error) {
      if (error instanceof EventbriteError && error.status === 404) {
        return eventNotFoundResult(event_id);
      }
      throw error;
    }
  },
});
