/** Eventbrite API v3 — Integrations Test probe (shared private token). */

const EVENTBRITE_API_BASE = "https://www.eventbriteapi.com/v3";

export async function testEventbriteConnection(token: string): Promise<string[]> {
  const meRes = await fetch(`${EVENTBRITE_API_BASE}/users/me/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!meRes.ok) {
    const body = await meRes.text().catch(() => "");
    throw new Error(
      `Eventbrite API error: ${meRes.status} ${meRes.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`,
    );
  }

  const me = await meRes.json() as { name?: string; emails?: Array<{ email?: string }> };
  const email = me.emails?.[0]?.email;
  const who = email ? `${me.name ?? "Eventbrite user"} <${email}>` : (me.name ?? "Eventbrite user");

  const orgRes = await fetch(`${EVENTBRITE_API_BASE}/users/me/organizations/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!orgRes.ok) {
    return [
      who,
      `Organizations lookup failed (${orgRes.status})`,
      "Use chat for live lookup (list_eventbrite_events, get_eventbrite_event)",
    ];
  }

  const orgs = await orgRes.json() as {
    organizations?: Array<{ id?: string; name?: string }>;
  };
  const names = (orgs.organizations ?? [])
    .map((org) => (org.name && org.id ? `${org.name} (${org.id})` : org.name ?? org.id))
    .filter((line): line is string => Boolean(line));

  return [
    who,
    names.length > 0 ? `Orgs: ${names.join(", ")}` : "No organizations on this token",
    "Use chat for live lookup (list_eventbrite_events, get_eventbrite_event)",
  ];
}
