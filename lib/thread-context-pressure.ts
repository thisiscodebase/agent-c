/** Approximate context window for the default chat model (gpt-5.6-luna). */
export const DEFAULT_CHAT_CONTEXT_WINDOW_TOKENS = 200_000;

/** Show the composer tip once estimated input is at or above this fraction. */
export const CONTEXT_PRESSURE_TIP_RATIO = 0.7;

export type ThreadContextPressure = {
  inputTokens: number | null;
  ratio: number | null;
  showTip: boolean;
  compacted: boolean;
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

/**
 * Estimate context pressure from Eve stream events (live or persisted).
 * Prefers the latest step/compaction input token signal.
 */
export function resolveThreadContextPressure(
  events: readonly unknown[] | undefined,
  contextWindowTokens = DEFAULT_CHAT_CONTEXT_WINDOW_TOKENS,
): ThreadContextPressure {
  let inputTokens: number | null = null;
  let compacted = false;

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
        }
      }
    }
  }

  const ratio =
    inputTokens !== null && contextWindowTokens > 0
      ? inputTokens / contextWindowTokens
      : null;

  const showTip =
    compacted || (ratio !== null && ratio >= CONTEXT_PRESSURE_TIP_RATIO);

  return { inputTokens, ratio, showTip, compacted };
}
