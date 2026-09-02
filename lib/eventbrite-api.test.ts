import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EVENTBRITE_API_BASE,
  EventbriteError,
  attendeeMatchesQuery,
  eventNotFoundResult,
  eventStartsInRange,
  getEventbriteApiKey,
  getEventbriteEvent,
  listEventbriteAttendees,
  listEventbriteEvents,
  searchEventbriteAttendees,
  sumQuantitySold,
} from "../agent/lib/eventbrite-api.ts";

describe("getEventbriteApiKey", () => {
  it("throws when the env var is missing", () => {
    const previous = process.env.EVENTBRITE_API_KEY;
    delete process.env.EVENTBRITE_API_KEY;
    try {
      assert.throws(() => getEventbriteApiKey(), /EVENTBRITE_API_KEY/);
    } finally {
      if (previous === undefined) {
        delete process.env.EVENTBRITE_API_KEY;
      } else {
        process.env.EVENTBRITE_API_KEY = previous;
      }
    }
  });
});

describe("helpers", () => {
  it("sums ticket quantity_sold", () => {
    assert.equal(
      sumQuantitySold([
        { name: "GA", quantity_sold: 10 },
        { name: "VIP", quantity_sold: 3 },
      ]),
      13,
    );
    assert.equal(sumQuantitySold(undefined), 0);
  });

  it("matches attendees by name or email", () => {
    const attendee = {
      id: "1",
      name: "Ada Lovelace",
      email: "ada@codebase.org",
      checked_in: true,
      cancelled: false,
      refunded: false,
    };
    assert.equal(attendeeMatchesQuery(attendee, "ada"), true);
    assert.equal(attendeeMatchesQuery(attendee, "CODEBASE"), true);
    assert.equal(attendeeMatchesQuery(attendee, "bob"), false);
  });

  it("filters events by start utc range", () => {
    const event = {
      id: "1",
      name: "Unfiltered",
      quantity_sold: 10,
      start: { utc: "2026-03-01T18:00:00Z" },
    };
    assert.equal(eventStartsInRange(event, "2026-01-01T00:00:00Z", "2026-12-31T23:59:59Z"), true);
    assert.equal(eventStartsInRange(event, "2025-01-01T00:00:00Z", "2025-12-31T23:59:59Z"), false);
  });
});

describe("Eventbrite HTTP helpers", () => {
  it("lists org events with venue and sold counts", async () => {
    const fetchMock: typeof fetch = async (input) => {
      const url = String(input);
      assert.equal(
        url,
        `${EVENTBRITE_API_BASE}/organizations/org1/events/?expand=venue%2Cticket_classes&status=all&time_filter=past&page_size=50&name_filter=Unfiltered`,
      );
      return Response.json({
        pagination: { object_count: 1, has_more_items: false },
        events: [
          {
            id: "111",
            name: { text: "Unfiltered Edinburgh" },
            status: "completed",
            start: { utc: "2026-02-04T18:00:00Z", local: "2026-02-04T18:00:00" },
            url: "https://www.eventbrite.com/e/111",
            venue: { id: "v1", name: "CodeBase", address: { city: "Edinburgh" } },
            ticket_classes: [{ name: "GA", quantity_sold: 42, quantity_total: 60 }],
          },
        ],
      });
    };

    const result = await listEventbriteEvents(
      "token",
      { name_filter: "Unfiltered", time_filter: "past", organizationId: "org1" },
      { fetch: fetchMock },
    );
    assert.equal(result.events.length, 1);
    assert.equal(result.events[0]?.quantity_sold, 42);
    assert.equal(result.events[0]?.venue?.city, "Edinburgh");
  });

  it("filters org events by start_date client-side", async () => {
    const fetchMock: typeof fetch = async () =>
      Response.json({
        events: [
          {
            id: "old",
            name: { text: "Unfiltered 2025" },
            start: { utc: "2025-06-01T18:00:00Z" },
            ticket_classes: [{ quantity_sold: 10 }],
          },
          {
            id: "new",
            name: { text: "Unfiltered 2026" },
            start: { utc: "2026-02-01T18:00:00Z" },
            ticket_classes: [{ quantity_sold: 20 }],
          },
        ],
      });

    const result = await listEventbriteEvents(
      "token",
      {
        organizationId: "org1",
        start_date: "2026-01-01T00:00:00Z",
      },
      { fetch: fetchMock },
    );
    assert.equal(result.events.length, 1);
    assert.equal(result.events[0]?.id, "new");
  });

  it("gets an event and attendance object_counts", async () => {
    const fetchMock: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/attendees/") && url.includes("status=attending")) {
        return Response.json({ pagination: { object_count: 30 } });
      }
      if (url.includes("/attendees/")) {
        return Response.json({ pagination: { object_count: 42 } });
      }
      assert.match(url, /\/events\/111\/\?expand=/);
      return Response.json({
        id: "111",
        name: { text: "Unfiltered Edinburgh" },
        url: "https://www.eventbrite.com/e/111",
        organizer: { name: "CodeBase" },
        venue: { name: "CodeBase", address: { city: "Edinburgh" } },
        ticket_classes: [{ name: "GA", quantity_sold: 42, quantity_total: 60 }],
      });
    };

    const event = await getEventbriteEvent("token", "111", { fetch: fetchMock });
    assert.equal(event.attendance.quantity_sold, 42);
    assert.equal(event.attendance.registered, 42);
    assert.equal(event.attendance.attending, 30);
    assert.equal(event.organizer_name, "CodeBase");
  });

  it("filters an attendee page by query", async () => {
    const fetchMock: typeof fetch = async () =>
      Response.json({
        pagination: { object_count: 2, has_more_items: false },
        attendees: [
          {
            id: "a1",
            profile: { name: "Ada Lovelace", email: "ada@codebase.org" },
            status: "Checked In",
            checked_in: true,
            cancelled: false,
            refunded: false,
            ticket_class_name: "GA",
          },
          {
            id: "a2",
            profile: { name: "Bob", email: "bob@example.com" },
            checked_in: false,
            cancelled: false,
            refunded: false,
          },
        ],
      });

    const result = await listEventbriteAttendees(
      "token",
      "111",
      { query: "ada" },
      { fetch: fetchMock },
    );
    assert.equal(result.attendees.length, 1);
    assert.equal(result.attendees[0]?.email, "ada@codebase.org");
    assert.equal(result.filtered_from_page, 2);
  });

  it("searches attendees across a capped event list", async () => {
    const fetchMock: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/organizations/org1/events/")) {
        return Response.json({
          pagination: { has_more_items: false },
          events: [
            {
              id: "111",
              name: { text: "Unfiltered Edinburgh" },
              url: "https://www.eventbrite.com/e/111",
              venue: { name: "CodeBase", address: { city: "Edinburgh" } },
              ticket_classes: [{ quantity_sold: 2 }],
            },
          ],
        });
      }
      return Response.json({
        attendees: [
          {
            id: "a1",
            profile: { name: "Ada Lovelace", email: "ada@codebase.org" },
            checked_in: true,
            cancelled: false,
            refunded: false,
          },
        ],
      });
    };

    const result = await searchEventbriteAttendees(
      "token",
      { query: "Ada", name_filter: "Unfiltered", organizationId: "org1" },
      { fetch: fetchMock },
    );
    assert.equal(result.matches.length, 1);
    assert.equal(result.matches[0]?.event.id, "111");
    assert.equal(result.truncated, false);
  });

  it("retries once on 429 then succeeds", async () => {
    let calls = 0;
    const fetchMock: typeof fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "0" },
        });
      }
      return Response.json({
        id: "111",
        name: { text: "Example" },
        ticket_classes: [],
      });
    };

    const sleeps: number[] = [];
    const event = await getEventbriteEvent("token", "111", {
      fetch: fetchMock,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    assert.ok(calls >= 2);
    assert.deepEqual(sleeps, [0]);
    assert.equal(event.name, "Example");
  });

  it("throws EventbriteError on 404", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(JSON.stringify({ error: "NOT_FOUND", error_description: "missing" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });

    await assert.rejects(
      () => getEventbriteEvent("token", "999", { fetch: fetchMock }),
      (error: unknown) => {
        assert.ok(error instanceof EventbriteError);
        assert.equal(error.status, 404);
        assert.equal(error.eventId, "999");
        return true;
      },
    );
  });
});

describe("eventNotFoundResult", () => {
  it("tells the model to list events instead of inventing an id", () => {
    const result = eventNotFoundResult("999");
    assert.equal(result.error, "not_found");
    assert.equal(result.event_id, "999");
    assert.match(result.message, /do not invent/i);
  });
});
