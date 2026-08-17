import {
  contextWindowForModel,
  FALLBACK_CONTEXT_WINDOW_TOKENS,
  normalizeModelId,
} from "#shared/models";
import { readEventModelId } from "#shared/usage-model";

/** Fallback window when the thread never reported which model ran. */
export const DEFAULT_CHAT_CONTEXT_WINDOW_TOKENS = FALLBACK_CONTEXT_WINDOW_TOKENS;

/** Show the composer tip once estimated input is at or above this fraction. */
export const CONTEXT_PRESSURE_TIP_RATIO = 0.7;

export type ThreadContextPressure = {
  inputTokens: number | null;
  ratio: number | null;
  showTip: boolean;
  compacted: boolean;
  /** Model id reported by the stream, normalized (no `dynamic:` prefix). */
  modelId: string | null;
  /** Real window for that model, not a hardcoded guess. */
  contextWindowTokens: number;
  /**
   * True when the newest usage signal came from `compaction.requested`, whose
   * `usageInputTokens` is the pre-compaction peak that *triggered* the pass.
   * `compaction.completed` carries no usage, so no post-compaction figure
   * exists until the next `step.completed`.
   */
  usageFromCompaction: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function readInputTokens(data: Record<string, unknown> | undefined): number | null {
  if (!data) {
    return null;
  }
  const usage = asRecord(data.usage);
  const fromUsage = usage?.inputTokens;
  if (typeof fromUsage === "number" && Number.isFinite(fromUsage) && fromUsage > 0) {
    return fromUsage;
  }
  const fromCompaction = data.usageInputTokens;
  if (
    typeof fromCompaction === "number"
    && Number.isFinite(fromCompaction)
    && fromCompaction > 0
  ) {
    return fromCompaction;
  }
  return null;
}

/** Model that actually ran — last `step.started` / compaction, else `session.started`. */
export function resolveThreadModelId(
  events: readonly unknown[] | undefined,
): string | null {
  if (!Array.isArray(events)) {
    return null;
  }
  let modelId: string | null = null;
  for (const raw of events) {
    const event = asRecord(raw);
    if (!event || typeof event.type !== "string") {
      continue;
    }
    const fromEvent = readEventModelId(event.type, asRecord(event.data));
    if (fromEvent) {
      modelId = fromEvent;
    }
  }
  return modelId;
}

/**
 * Estimate context pressure from Eve stream events (live or persisted).
 * Prefers the latest step/compaction input token signal, and sizes the window
 * from the model the thread actually ran on.
 */
export function resolveThreadContextPressure(
  events: readonly unknown[] | undefined,
  contextWindowTokensOverride?: number,
): ThreadContextPressure {
  let inputTokens: number | null = null;
  let compacted = false;
  let usageFromCompaction = false;

  if (Array.isArray(events)) {
    for (const raw of events) {
      const event = asRecord(raw);
      if (!event) {
        continue;
      }
      if (event.type === "compaction.requested" || event.type === "compaction.completed") {
        compacted = true;
      }
      if (
        event.type === "step.completed"
        || event.type === "compaction.requested"
      ) {
        const tokens = readInputTokens(asRecord(event.data));
        if (tokens !== null) {
          inputTokens = tokens;
          usageFromCompaction = event.type === "compaction.requested";
        }
      }
    }
  }

  const rawModelId = resolveThreadModelId(events);
  const modelId = normalizeModelId(rawModelId);
  const contextWindowTokens =
    contextWindowTokensOverride ?? contextWindowForModel(rawModelId);

  const ratio =
    inputTokens !== null && contextWindowTokens > 0
      ? inputTokens / contextWindowTokens
      : null;

  const showTip =
    compacted || (ratio !== null && ratio >= CONTEXT_PRESSURE_TIP_RATIO);

  return {
    inputTokens,
    ratio,
    showTip,
    compacted,
    modelId,
    contextWindowTokens,
    usageFromCompaction,
  };
}
