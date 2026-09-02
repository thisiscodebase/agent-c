/**
 * Eventbrite API v3 client (shared org private token, Bearer).
 *
 * @see https://www.eventbrite.com/platform/api
 */

export const EVENTBRITE_API_BASE = "https://www.eventbriteapi.com/v3";

export const EVENTBRITE_API_KEY_ENV = "EVENTBRITE_API_KEY";
export const EVENTBRITE_ORGANIZATION_ID_ENV = "EVENTBRITE_ORGANIZATION_ID";

/** Max events scanned by person search (keeps org-wide walks bounded). */
export const SEARCH_ATTENDEE_EVENT_CAP = 15;

const DEFAULT_RETRY_AFTER_MS = 5_000;
const MAX_RETRY_AFTER_MS = 30_000;
const SEARCH_EVENT_PAGE_CAP = 3;
const EVENT_EXPAND = "venue,ticket_classes";
const EVENT_DETAIL_EXPAND = "venue,ticket_classes,organizer";

export type EventbriteFetchDeps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export class EventbriteError extends Error {
  readonly status: number;
  readonly eventId?: string;

  constructor(message: string, status: number, eventId?: string) {
    super(message);
    this.name = "EventbriteError";
    this.status = status;
    this.eventId = eventId;
  }
}

export type EventbriteVenueSummary = {
  id?: string;
  name?: string;
  city?: string;
  region?: string;
  country?: string;
  address?: string;
};

export type EventbriteTicketClassSummary = {
  id?: string;
  name: string;
  quantity_sold?: number;
  quantity_total?: number;
};

export type EventbriteDatetime = {
  utc?: string;
  local?: string;
  timezone?: string;
};

export type EventbriteEventSummary = {
  id: string;
  name: string;
  status?: string;
  start?: EventbriteDatetime;
  end?: EventbriteDatetime;
  url?: string;
  online_event?: boolean;
  is_series?: boolean;
  is_series_parent?: boolean;
  series_id?: string;
  venue?: EventbriteVenueSummary;
  capacity?: number;
  quantity_sold: number;
  ticket_classes?: EventbriteTicketClassSummary[];
};

export type EventbriteAttendanceCounts = {
  quantity_sold: number;
  registered?: number;
  attending?: number;
};

export type EventbriteEventDetail = EventbriteEventSummary & {
  description?: string;
  organizer_name?: string;
  attendance: EventbriteAttendanceCounts;
};

export type EventbriteAttendee = {
  id: string;
  name?: string;
  email?: string;
  status?: string;
  checked_in: boolean;
  cancelled: boolean;
  refunded: boolean;
  ticket_class_name?: string;
  created?: string;
  event_id?: string;
};

export type EventbritePagination = {
  object_count?: number;
  page_number?: number;
  page_size?: number;
  page_count?: number;
  has_more_items?: boolean;
  continuation?: string;
};

export type EventbriteEventStatus
  = "draft" | "live" | "started" | "ended" | "completed" | "canceled" | "all";

export type EventbriteTimeFilter = "all" | "past" | "current_future";

export type EventbriteAttendeeStatus = "attending" | "not_attending" | "unpaid";

type MultipartText = { text?: string; html?: string };

type VenueApi = {
  id?: string;
  name?: string;
  address?: {
    city?: string;
    region?: string;
    country?: string;
    localized_address_display?: string;
    address_1?: string;
  };
};

type TicketClassApi = {
  id?: string;
  name?: string;
  quantity_sold?: number;
  quantity_total?: number;
};

type EventApi = {
  id?: string;
  name?: MultipartText;
  description?: MultipartText;
  status?: string;
  start?: EventbriteDatetime;
  end?: EventbriteDatetime;
  url?: string;
  online_event?: boolean;
  is_series?: boolean;
  is_series_parent?: boolean;
  series_id?: string;
  venue_id?: string;
  venue?: VenueApi;
  capacity?: number;
  organizer?: { name?: string };
  ticket_classes?: TicketClassApi[];
};

type AttendeeApi = {
  id?: string;
  profile?: { name?: string; email?: string; first_name?: string; last_name?: string };
  status?: string;
  checked_in?: boolean;
  cancelled?: boolean;
  refunded?: boolean;
  ticket_class_name?: string;
  created?: string;
  event_id?: string;
};

type PaginationApi = EventbritePagination;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getEventbriteApiKey(): string {
  const key = process.env[EVENTBRITE_API_KEY_ENV]?.trim();
  if (!key) {
    throw new Error(
      `${EVENTBRITE_API_KEY_ENV} is not configured. Set the Eventbrite Private token on the Eve runtime and web (Settings → Integrations).`,
    );
  }
  return key;
}

export function getConfiguredOrganizationId(): string | undefined {
  const id = process.env[EVENTBRITE_ORGANIZATION_ID_ENV]?.trim();
  return id || undefined;
}

function retryAfterMs(res: Response): number {
  const raw = res.headers.get("retry-after");
  if (!raw) return DEFAULT_RETRY_AFTER_MS;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }
  return DEFAULT_RETRY_AFTER_MS;
}

async function readErrorDetail(res: Response): Promise<string> {
  const fallback = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json() as {
      error_description?: string;
      error?: string;
    };
    const detail = body.error_description ?? body.error;
    return detail ? `${fallback}: ${detail}` : fallback;
  } catch {
    return fallback;
  }
}

function eventIdFromPath(path: string): string | undefined {
  const match = path.match(/\/events\/([^/?]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export async function eventbriteGetJson<T>(
  apiKey: string,
  path: string,
  deps: EventbriteFetchDeps = {},
): Promise<T> {
  const fetchFn = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? defaultSleep;
  const url = path.startsWith("http")
    ? path
    : `${EVENTBRITE_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const request = () =>
    fetchFn(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

  let res = await request();
  if (res.status === 429) {
    await sleep(retryAfterMs(res));
    res = await request();
  }

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new EventbriteError(
      `Eventbrite API error: ${detail}`,
      res.status,
      eventIdFromPath(path),
    );
  }

  return res.json() as Promise<T>;
}

export async function resolveOrganizationId(
  apiKey: string,
  deps: EventbriteFetchDeps = {},
  organizationId?: string,
): Promise<string> {
  const configured = organizationId?.trim() || getConfiguredOrganizationId();
  if (configured) return configured;

  const data = await eventbriteGetJson<{
    organizations?: Array<{ id?: string; name?: string }>;
  }>(apiKey, "/users/me/organizations/", deps);

  const orgs = (data.organizations ?? []).filter((org) => org.id);
  if (orgs.length === 0) {
    throw new EventbriteError(
      "No Eventbrite organizations on this token. Set EVENTBRITE_ORGANIZATION_ID.",
      404,
    );
  }
  if (orgs.length > 1) {
    const names = orgs
      .map((org) => `${org.name ?? "org"} (${org.id})`)
      .join(", ");
    throw new EventbriteError(
      `Multiple Eventbrite organizations: ${names}. Set EVENTBRITE_ORGANIZATION_ID.`,
      400,
    );
  }
  return orgs[0]!.id!;
}

export function mapVenue(venue: VenueApi | undefined): EventbriteVenueSummary | undefined {
  if (!venue) return undefined;
  const address = venue.address;
  return {
    id: venue.id,
    name: venue.name,
    city: address?.city,
    region: address?.region,
    country: address?.country,
    address: address?.localized_address_display ?? address?.address_1,
  };
}

export function sumQuantitySold(ticketClasses: TicketClassApi[] | undefined): number {
  return (ticketClasses ?? []).reduce(
    (sum, ticket) => sum + (ticket.quantity_sold ?? 0),
    0,
  );
}

function mapTicketClasses(
  ticketClasses: TicketClassApi[] | undefined,
): EventbriteTicketClassSummary[] | undefined {
  if (!ticketClasses?.length) return undefined;
  return ticketClasses.map((ticket) => ({
    id: ticket.id,
    name: ticket.name ?? "Ticket",
    quantity_sold: ticket.quantity_sold,
    quantity_total: ticket.quantity_total,
  }));
}

export function mapEvent(event: EventApi): EventbriteEventSummary | undefined {
  if (!event.id) return undefined;
  return {
    id: event.id,
    name: event.name?.text ?? event.id,
    status: event.status,
    start: event.start,
    end: event.end,
    url: event.url,
    online_event: event.online_event,
    is_series: event.is_series,
    is_series_parent: event.is_series_parent,
    series_id: event.series_id,
    venue: mapVenue(event.venue),
    capacity: event.capacity,
    quantity_sold: sumQuantitySold(event.ticket_classes),
    ticket_classes: mapTicketClasses(event.ticket_classes),
  };
}

export function mapAttendee(attendee: AttendeeApi): EventbriteAttendee | undefined {
  if (!attendee.id) return undefined;
  const profile = attendee.profile;
  const composed = [profile?.first_name, profile?.last_name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");
  return {
    id: attendee.id,
    name: profile?.name || composed || undefined,
    email: profile?.email,
    status: attendee.status,
    checked_in: attendee.checked_in === true,
    cancelled: attendee.cancelled === true,
    refunded: attendee.refunded === true,
    ticket_class_name: attendee.ticket_class_name,
    created: attendee.created,
    event_id: attendee.event_id,
  };
}

export function attendeeMatchesQuery(
  attendee: EventbriteAttendee,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const name = (attendee.name ?? "").toLowerCase();
  const email = (attendee.email ?? "").toLowerCase();
  return name.includes(needle) || email.includes(needle);
}

export function eventStartsInRange(
  event: EventbriteEventSummary,
  startDate?: string,
  endDate?: string,
): boolean {
  const utc = event.start?.utc;
  if (!utc) return !startDate && !endDate;
  if (startDate && utc < startDate) return false;
  if (endDate && utc > endDate) return false;
  return true;
}

function setCommonListParams(
  params: URLSearchParams,
  options: {
    status?: EventbriteEventStatus;
    time_filter?: EventbriteTimeFilter;
    page_size?: number;
    continuation?: string;
    expand?: string;
  },
) {
  params.set("expand", options.expand ?? EVENT_EXPAND);
  params.set("status", options.status ?? "all");
  if (options.time_filter) {
    params.set("time_filter", options.time_filter);
  }
  params.set("page_size", String(options.page_size ?? 50));
  if (options.continuation) {
    params.set("continuation", options.continuation);
  }
}

export async function listEventbriteEvents(
  apiKey: string,
  options: {
    name_filter?: string;
    status?: EventbriteEventStatus;
    time_filter?: EventbriteTimeFilter;
    venue_id?: string;
    series_id?: string;
    start_date?: string;
    end_date?: string;
    page_size?: number;
    continuation?: string;
    organizationId?: string;
  } = {},
  deps: EventbriteFetchDeps = {},
): Promise<{
  events: EventbriteEventSummary[];
  pagination?: EventbritePagination;
  continuation?: string;
}> {
  const params = new URLSearchParams();
  setCommonListParams(params, options);

  let path: string;
  if (options.series_id?.trim()) {
    if (options.start_date) {
      params.set("start_date.range_start", options.start_date);
    }
    if (options.end_date) {
      params.set("start_date.range_end", options.end_date);
    }
    path = `/series/${encodeURIComponent(options.series_id.trim())}/events/?${params}`;
  } else {
    if (options.name_filter?.trim()) {
      params.set("name_filter", options.name_filter.trim());
    }
    if (options.venue_id?.trim()) {
      params.set("venue_filter", options.venue_id.trim());
    }
    const orgId = await resolveOrganizationId(apiKey, deps, options.organizationId);
    path = `/organizations/${encodeURIComponent(orgId)}/events/?${params}`;
  }

  const data = await eventbriteGetJson<{
    events?: EventApi[];
    pagination?: PaginationApi;
  }>(apiKey, path, deps);

  let events = (data.events ?? [])
    .map(mapEvent)
    .filter((event): event is EventbriteEventSummary => Boolean(event));

  if (!options.series_id && (options.start_date || options.end_date)) {
    events = events.filter((event) =>
      eventStartsInRange(event, options.start_date, options.end_date),
    );
  }

  return {
    events,
    pagination: data.pagination,
    continuation: data.pagination?.has_more_items
      ? data.pagination.continuation
      : undefined,
  };
}

async function attendeeObjectCount(
  apiKey: string,
  eventId: string,
  status: EventbriteAttendeeStatus | undefined,
  deps: EventbriteFetchDeps,
): Promise<number | undefined> {
  const params = new URLSearchParams({ page_size: "1" });
  if (status) params.set("status", status);
  try {
    const data = await eventbriteGetJson<{ pagination?: PaginationApi }>(
      apiKey,
      `/events/${encodeURIComponent(eventId)}/attendees/?${params}`,
      deps,
    );
    return data.pagination?.object_count;
  } catch (error) {
    if (error instanceof EventbriteError && (error.status === 403 || error.status === 404)) {
      return undefined;
    }
    throw error;
  }
}

export async function getEventbriteEvent(
  apiKey: string,
  eventId: string,
  deps: EventbriteFetchDeps = {},
): Promise<EventbriteEventDetail> {
  const id = eventId.trim();
  const data = await eventbriteGetJson<EventApi>(
    apiKey,
    `/events/${encodeURIComponent(id)}/?expand=${EVENT_DETAIL_EXPAND}`,
    deps,
  );
  const mapped = mapEvent(data);
  if (!mapped) {
    throw new EventbriteError("Eventbrite event response was missing an id", 502, id);
  }

  const [registered, attending] = await Promise.all([
    attendeeObjectCount(apiKey, mapped.id, undefined, deps),
    attendeeObjectCount(apiKey, mapped.id, "attending", deps),
  ]);

  return {
    ...mapped,
    description: data.description?.text,
    organizer_name: data.organizer?.name,
    attendance: {
      quantity_sold: mapped.quantity_sold,
      registered,
      attending,
    },
  };
}

export async function listEventbriteAttendees(
  apiKey: string,
  eventId: string,
  options: {
    status?: EventbriteAttendeeStatus;
    query?: string;
    continuation?: string;
    page_size?: number;
  } = {},
  deps: EventbriteFetchDeps = {},
): Promise<{
  event_id: string;
  attendees: EventbriteAttendee[];
  pagination?: EventbritePagination;
  continuation?: string;
  filtered_from_page?: number;
}> {
  const id = eventId.trim();
  const params = new URLSearchParams({
    page_size: String(options.page_size ?? 50),
  });
  if (options.status) params.set("status", options.status);
  if (options.continuation) params.set("continuation", options.continuation);

  const data = await eventbriteGetJson<{
    attendees?: AttendeeApi[];
    pagination?: PaginationApi;
  }>(apiKey, `/events/${encodeURIComponent(id)}/attendees/?${params}`, deps);

  const mapped = (data.attendees ?? [])
    .map(mapAttendee)
    .filter((attendee): attendee is EventbriteAttendee => Boolean(attendee));
  const filtered = options.query?.trim()
    ? mapped.filter((attendee) => attendeeMatchesQuery(attendee, options.query!))
    : mapped;

  return {
    event_id: id,
    attendees: filtered,
    pagination: data.pagination,
    continuation: data.pagination?.has_more_items
      ? data.pagination.continuation
      : undefined,
    filtered_from_page: options.query?.trim() ? mapped.length : undefined,
  };
}

export type EventbriteAttendeeMatch = {
  name?: string;
  email?: string;
  status?: string;
  checked_in: boolean;
  ticket_class_name?: string;
  event: EventbriteEventSummary;
};

export async function searchEventbriteAttendees(
  apiKey: string,
  options: {
    query: string;
    name_filter?: string;
    time_filter?: EventbriteTimeFilter;
    start_date?: string;
    end_date?: string;
    series_id?: string;
    status?: EventbriteAttendeeStatus;
    continuation?: string;
    organizationId?: string;
  },
  deps: EventbriteFetchDeps = {},
): Promise<{
  query: string;
  matches: EventbriteAttendeeMatch[];
  events_scanned: number;
  events_capped: boolean;
  truncated: boolean;
  continuation?: string;
  note?: string;
}> {
  const query = options.query.trim();
  const matches: EventbriteAttendeeMatch[] = [];
  let continuation = options.continuation;
  let eventsScanned = 0;
  let truncated = false;
  let pages = 0;
  let lastContinuation: string | undefined;

  while (eventsScanned < SEARCH_ATTENDEE_EVENT_CAP && pages < SEARCH_EVENT_PAGE_CAP) {
    const page = await listEventbriteEvents(
      apiKey,
      {
        name_filter: options.name_filter,
        time_filter: options.time_filter,
        series_id: options.series_id,
        start_date: options.start_date,
        end_date: options.end_date,
        continuation,
        organizationId: options.organizationId,
        page_size: 50,
        status: "all",
      },
      deps,
    );
    pages += 1;
    lastContinuation = page.continuation;

    for (const event of page.events) {
      if (eventsScanned >= SEARCH_ATTENDEE_EVENT_CAP) {
        truncated = true;
        break;
      }
      eventsScanned += 1;
      const roster = await listEventbriteAttendees(
        apiKey,
        event.id,
        { status: options.status, query, page_size: 50 },
        deps,
      );
      for (const attendee of roster.attendees) {
        matches.push({
          name: attendee.name,
          email: attendee.email,
          status: attendee.status,
          checked_in: attendee.checked_in,
          ticket_class_name: attendee.ticket_class_name,
          event,
        });
      }
      if (roster.continuation || (roster.pagination?.object_count ?? 0) > 50) {
        truncated = true;
      }
    }

    if (!page.continuation || eventsScanned >= SEARCH_ATTENDEE_EVENT_CAP) {
      if (page.continuation && eventsScanned >= SEARCH_ATTENDEE_EVENT_CAP) {
        truncated = true;
      }
      continuation = page.continuation;
      break;
    }
    continuation = page.continuation;
  }

  const eventsCapped = eventsScanned >= SEARCH_ATTENDEE_EVENT_CAP || pages >= SEARCH_EVENT_PAGE_CAP;
  if (eventsCapped && lastContinuation) truncated = true;

  return {
    query,
    matches,
    events_scanned: eventsScanned,
    events_capped: eventsCapped,
    truncated,
    continuation: truncated ? lastContinuation ?? continuation : undefined,
    note: truncated
      ? "Scan was capped (15 events, first 50 attendees per event). Pass continuation to continue, or list_eventbrite_attendees on a specific event_id."
      : undefined,
  };
}

export function eventNotFoundResult(eventId: string): {
  error: "not_found";
  event_id: string;
  message: string;
} {
  return {
    error: "not_found",
    event_id: eventId.trim(),
    message: `No Eventbrite event with id ${eventId.trim()} (or this org token cannot access it). List events next — do not invent an event id.`,
  };
}
