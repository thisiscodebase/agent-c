import { normalizeModelId } from "./models.ts";

/**
 * Canonical Gateway id for stats / logos (`openai/gpt-5.6-luna`).
 * Strips Eve's `dynamic:` prefix so older and newer stream events merge.
 */
export function canonicalModelId(raw: string | null | undefined): string | null {
  return normalizeModelId(raw);
}

/** Provider segment of a Gateway model id (`openai`, `anthropic`, `xai`). */
export function modelProviderFromId(modelId: string): string {
  const id = canonicalModelId(modelId) ?? modelId.trim();
  const slash = id.indexOf("/");
  if (slash > 0) {
    return id.slice(0, slash).toLowerCase();
  }
  return id.toLowerCase();
}

/**
 * Model that actually ran for this stream event.
 *
 * Eve ≥0.33 reports the resolved id on `step.started` (and compaction).
 * Older rows still carry `runtime.modelId` on `session.started`, often as
 * `dynamic:<fallback>`.
 */
export function readEventModelId(
  eventType: string,
  data: Record<string, unknown> | undefined,
): string | null {
  if (!data) {
    return null;
  }

  switch (eventType) {
    case "session.started": {
      const runtime = data.runtime;
      if (!runtime || typeof runtime !== "object") {
        return null;
      }
      const modelId = (runtime as { modelId?: unknown }).modelId;
      return typeof modelId === "string" ? canonicalModelId(modelId) : null;
    }
    case "step.started":
    case "compaction.requested":
    case "compaction.completed": {
      const modelId = data.modelId;
      return typeof modelId === "string" ? canonicalModelId(modelId) : null;
    }
    default:
      return null;
  }
}

/** True when the event reports the model that actually ran (not a session fallback). */
export function isResolvedRunModelEvent(eventType: string): boolean {
  switch (eventType) {
    case "step.started":
    case "compaction.requested":
    case "compaction.completed":
      return true;
    default:
      return false;
  }
}

/** Models to credit on a thread: live step/compaction ids, else session.started. */
export function creditedModelIdsFromEvents(
  events: ReadonlyArray<{ type: string; data?: Record<string, unknown> }>,
): string[] {
  const fallback = new Set<string>();
  const resolved = new Set<string>();
  for (const event of events) {
    const id = readEventModelId(event.type, event.data);
    if (!id) {
      continue;
    }
    if (isResolvedRunModelEvent(event.type)) {
      resolved.add(id);
    } else {
      fallback.add(id);
    }
  }
  return [...(resolved.size > 0 ? resolved : fallback)];
}
