import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getEventbriteApiKey,
  listEventbriteEvents,
} from "../lib/eventbrite-api.js";

/**
 * Eventbrite org (or series) event list — shared private token.
 *
 * @see https://www.eventbrite.com/platform/api#/reference/event/list/list-events-by-organization
 */
export default defineTool({
  description:
    "List this organization's Eventbrite events (name, venue/city, start, capacity, tickets sold). Use name_filter for series like Unfiltered. Org lists have no date-range param — pass series_id for start_date/end_date, or filter start.utc after paging. quantity_sold is signups, not door check-in. Cite event url. Do not invent event ids.",
  inputSchema: z.object({
    name_filter: z
      .string()
      .min(1)
      .optional()
      .describe("Filter events whose name contains this text (e.g. Unfiltered)."),
    status: z
      .enum(["draft", "live", "started", "ended", "completed", "canceled", "all"])
      .optional()
      .describe("Event status filter. Defaults to all."),
    time_filter: z
      .enum(["all", "past", "current_future"])
      .optional()
      .describe("Past vs upcoming. Defaults to Eventbrite's all."),
    venue_id: z
      .string()
      .min(1)
      .optional()
      .describe("Restrict to a venue id from a previous event."),
    series_id: z
      .string()
      .min(1)
      .optional()
      .describe(
        "If set, lists occurrences of that series (supports start_date/end_date).",
      ),
    start_date: z
      .string()
      .min(1)
      .optional()
      .describe(
        "ISO 8601 lower bound on event start. Applied as series range_start, or client-side on org lists.",
      ),
    end_date: z
      .string()
      .min(1)
      .optional()
      .describe(
        "ISO 8601 upper bound on event start. Applied as series range_end, or client-side on org lists.",
      ),
    page_size: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Page size (1–50). Defaults to 50."),
    continuation: z
      .string()
      .min(1)
      .optional()
      .describe("Pagination token from a previous list_eventbrite_events call."),
  }),
  async execute(input) {
    const apiKey = getEventbriteApiKey();
    return listEventbriteEvents(apiKey, input);
  },
});
