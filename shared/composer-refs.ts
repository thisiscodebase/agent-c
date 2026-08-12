/**
 * Composer `@` mentions for connected Drive, Notion, HubSpot, Asana, and Tally.
 * Chips show pretty `@name`; serialization emits stable id markers for the agent.
 */

export type ComposerRefService =
  | "drive"
  | "notion"
  | "hubspot"
  | "asana"
  | "tally";

export type ComposerRefItem = {
  id: string;
  name: string;
  url?: string;
  mimeType?: string;
  /** ISO timestamp — last modified / last edited. */
  modifiedAt?: string;
  /** ISO timestamp — created. */
  createdAt?: string;
  /** Display name of owner / last editor when known. */
  author?: string;
};

export type ComposerRefServiceMeta = {
  id: ComposerRefService;
  /** Connector registry id — matches `server/connectors.ts`. */
  connectorId: ComposerRefService;
  label: string;
  description: string;
  iconSrc: string;
};

/** Services available in the `@` picker. */
export const COMPOSER_REF_SERVICES: readonly ComposerRefServiceMeta[] = [
  {
    id: "drive",
    connectorId: "drive",
    label: "Google Drive",
    description: "Files and docs you can access",
    iconSrc: "/icons/drive.svg",
  },
  {
    id: "notion",
    connectorId: "notion",
    label: "Notion",
    description: "Pages in your workspace",
    iconSrc: "/icons/notion.svg",
  },
  {
    id: "hubspot",
    connectorId: "hubspot",
    label: "HubSpot",
    description: "Contacts and companies in CRM",
    iconSrc: "/icons/hubspot.svg",
  },
  {
    id: "asana",
    connectorId: "asana",
    label: "Asana",
    description: "Tasks and projects you can access",
    iconSrc: "/icons/asana.svg",
  },
  {
    id: "tally",
    connectorId: "tally",
    label: "Tally",
    description: "Forms in your workspaces",
    iconSrc: "/icons/tally.svg",
  },
] as const;

/**
 * Matches `[[ref:drive:FILE_ID|Display name]]` (name may contain escaped chars).
 * HubSpot/Asana ids may include a kind prefix (`contact:123`, `task:456`).
 */
export const COMPOSER_REF_MARKER_RE =
  /\[\[ref:(drive|notion|hubspot|asana|tally):([^|\]]+)\|((?:\\.|[^\]\\])*)\]\]/g;

function escapeRefName(name: string): string {
  return name.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/]/g, "\\]");
}

function unescapeRefName(name: string): string {
  return name.replace(/\\([\\|\\\]])/g, "$1");
}

/** Agent-facing token stored in the message. */
export function formatRefMarker(
  service: ComposerRefService,
  id: string,
  name: string,
): string {
  return `[[ref:${service}:${id}|${escapeRefName(name)}]]`;
}

export type ParsedComposerRef = {
  service: ComposerRefService;
  id: string;
  name: string;
  /** Full marker substring including brackets. */
  raw: string;
  index: number;
};

/** Find all ref markers in agent/stored text. */
export function parseRefMarkers(text: string): ParsedComposerRef[] {
  const out: ParsedComposerRef[] = [];
  const re = new RegExp(COMPOSER_REF_MARKER_RE.source, "g");
  for (const match of text.matchAll(re)) {
    const service = match[1] as ComposerRefService;
    const id = match[2];
    const name = unescapeRefName(match[3] ?? "");
    if (!id || !match[0]) continue;
    out.push({
      service,
      id,
      name,
      raw: match[0],
      index: match.index ?? 0,
    });
  }
  return out;
}

/** Pretty form for titles / previews: markers → `@name`. */
export function toDisplayText(text: string): string {
  return text.replace(COMPOSER_REF_MARKER_RE, (_full, _service, _id, name) => {
    return `@${unescapeRefName(String(name))}`;
  });
}

export function getComposerRefService(
  id: string,
): ComposerRefServiceMeta | undefined {
  return COMPOSER_REF_SERVICES.find((service) => service.id === id);
}

export function isComposerRefService(id: string): id is ComposerRefService {
  return (
    id === "drive" ||
    id === "notion" ||
    id === "hubspot" ||
    id === "asana" ||
    id === "tally"
  );
}
