/**
 * Parse Asana task / project URLs for composer paste-to-chip.
 *
 * Supports legacy V0 and current V1 browser formats:
 * - https://app.asana.com/0/{project}/{task}
 * - https://app.asana.com/0/0/{task}
 * - https://app.asana.com/1/{workspace}/task/{task}
 * - https://app.asana.com/1/{workspace}/project/{project}/task/{task}
 * - https://app.asana.com/1/{workspace}/project/{project}
 */

export type AsanaObjectKind = "task" | "project";

export type ParsedAsanaUrl = {
  kind: AsanaObjectKind;
  objectId: string;
  projectId?: string;
  workspaceId?: string;
  url: string;
};

const GID_RE = /^\d{3,}$/;

function stripClipboardNoise(text: string): string {
  return text
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/^<|>$/g, "")
    .replace(/^["']|["']$/g, "");
}

function isAsanaHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "app.asana.com" ||
    host === "asana.com" ||
    host.endsWith(".asana.com")
  );
}

export function asanaKindLabel(kind: AsanaObjectKind): string {
  switch (kind) {
    case "task":
      return "Task";
    case "project":
      return "Project";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function formatAsanaRefId(
  kind: AsanaObjectKind,
  objectId: string,
): string {
  return `${kind}:${objectId}`;
}

export function parseAsanaRefId(
  refId: string,
): { kind: AsanaObjectKind; objectId: string } | null {
  const colon = refId.indexOf(":");
  if (colon <= 0) return null;
  const kind = refId.slice(0, colon);
  const objectId = refId.slice(colon + 1).trim();
  if (!objectId || !GID_RE.test(objectId)) return null;
  if (kind !== "task" && kind !== "project") return null;
  return { kind, objectId };
}

export function asanaFallbackName(
  kind: AsanaObjectKind,
  objectId: string,
): string {
  const short =
    objectId.length > 10
      ? `${objectId.slice(0, 4)}…${objectId.slice(-4)}`
      : objectId;
  return `${asanaKindLabel(kind)} ${short}`;
}

export function isSoleAsanaUrl(text: string): boolean {
  const cleaned = stripClipboardNoise(text);
  if (!cleaned || /\s/.test(cleaned)) return false;
  return parseAsanaUrl(cleaned) !== null;
}

export function parseAsanaUrl(raw: string): ParsedAsanaUrl | null {
  let url: URL;
  try {
    url = new URL(stripClipboardNoise(raw));
  } catch {
    return null;
  }

  if (!isAsanaHost(url.hostname)) return null;

  const parts = url.pathname.split("/").filter(Boolean);

  // V1: /1/{workspace}/…
  if (parts[0] === "1" && parts[1] && GID_RE.test(parts[1])) {
    const workspaceId = parts[1];

    // /1/{ws}/task/{task}
    if (parts[2] === "task" && parts[3] && GID_RE.test(parts[3])) {
      const objectId = parts[3];
      return {
        kind: "task",
        objectId,
        workspaceId,
        url: `https://app.asana.com/1/${workspaceId}/task/${objectId}`,
      };
    }

    // /1/{ws}/home/task/{task}
    if (
      parts[2] === "home" &&
      parts[3] === "task" &&
      parts[4] &&
      GID_RE.test(parts[4])
    ) {
      const objectId = parts[4];
      return {
        kind: "task",
        objectId,
        workspaceId,
        url: `https://app.asana.com/1/${workspaceId}/task/${objectId}`,
      };
    }

    // /1/{ws}/project/{project}/task/{task}…
    if (parts[2] === "project" && parts[3] && GID_RE.test(parts[3])) {
      const projectId = parts[3];
      if (parts[4] === "task" && parts[5] && GID_RE.test(parts[5])) {
        const objectId = parts[5];
        return {
          kind: "task",
          objectId,
          projectId,
          workspaceId,
          url: `https://app.asana.com/1/${workspaceId}/project/${projectId}/task/${objectId}`,
        };
      }
      return {
        kind: "project",
        objectId: projectId,
        projectId,
        workspaceId,
        url: `https://app.asana.com/1/${workspaceId}/project/${projectId}`,
      };
    }
  }

  // V0: /0/{projectOrZero}/{taskOrProject}[/f]
  if (parts[0] === "0" && parts[1] && parts[2]) {
    const a = parts[1];
    const b = parts[2];
    // First segment may be literal "0" (task-only permalink).
    if (a !== "0" && !GID_RE.test(a)) return null;
    if (!GID_RE.test(b)) return null;

    // /0/{project}/{project} → project permalink
    if (a === b) {
      return {
        kind: "project",
        objectId: a,
        projectId: a,
        url: `https://app.asana.com/0/${a}/${a}`,
      };
    }

    // /0/0/{task} or /0/{project}/{task}
    return {
      kind: "task",
      objectId: b,
      projectId: a === "0" ? undefined : a,
      url:
        a === "0"
          ? `https://app.asana.com/0/0/${b}`
          : `https://app.asana.com/0/${a}/${b}`,
    };
  }

  return null;
}
