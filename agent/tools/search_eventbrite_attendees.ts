import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getEventbriteApiKey,
  searchEventbriteAttendees,
} from "../lib/eventbrite-api.js";

/**
 * Bounded person search across org Eventbrite events.
 *
 * Eventbrite has no attendee name/email search; this walks a capped event list.
 */
export default defineTool({
  description:
    "Find a person (name or email) across this org's Eventbrite events. Use name_filter (e.g. Unfiltered) and start_date/end_date for a series window. Scans at most 15 events and the first 50 attendees each — pass continuation or list_eventbrite_attendees on a known event_id if truncated. Returns matches with event venue and check-in status.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe("Attendee name or email to match (case-insensitive substring)."),
    name_filter: z
      .string()
      .min(1)
      .optional()
      .describe("Only scan events whose name contains this text (e.g. Unfiltered)."),
    time_filter: z
      .enum(["all", "past", "current_future"])
      .optional()
      .describe("Past vs upcoming events when scanning."),
    start_date: z
      .string()
      .min(1)
      .optional()
      .describe("ISO 8601 lower bound on event start (client-side unless series_id is set)."),
    end_date: z
      .string()
      .min(1)
      .optional()
      .describe("ISO 8601 upper bound on event start."),
    series_id: z
      .string()
      .min(1)
      .optional()
      .describe("Scan occurrences of this series instead of the org list."),
    status: z
      .enum(["attending", "not_attending", "unpaid"])
      .optional()
      .describe("Optional attendee status filter when listing each event."),
    continuation: z
      .string()
      .min(1)
      .optional()
      .describe("Continue a truncated scan from a previous search_eventbrite_attendees call."),
  }),
  async execute(input) {
    const apiKey = getEventbriteApiKey();
    return searchEventbriteAttendees(apiKey, input);
  },
});
