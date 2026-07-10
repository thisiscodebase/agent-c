export type TitleTurnRole = "user" | "assistant";

export interface TitleTurn {
  role: TitleTurnRole;
  text: string;
}

const MAX_TURNS = 8;
const MAX_CHARS_PER_TURN = 400;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function truncateTurnText(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= MAX_CHARS_PER_TURN) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_CHARS_PER_TURN - 1)}…`;
}

/**
 * Extract plain user/assistant turns from persisted Eve stream events.
 * Caps to the most recent turns and truncates each message for cheap prompts.
 */
export function extractTitleTurnsFromEvents(events: readonly unknown[]): TitleTurn[] {
  const turns: TitleTurn[] = [];

  for (const event of events) {
    if (!isRecord(event) || typeof event.type !== "string") {
      continue;
    }

    const data = event.data;
    if (!isRecord(data)) {
      continue;
    }

    if (event.type === "message.received" && typeof data.message === "string") {
      const text = truncateTurnText(data.message);
      if (text) {
        turns.push({ role: "user", text });
      }
      continue;
    }

    if (event.type === "message.completed" && typeof data.message === "string") {
      const text = truncateTurnText(data.message);
      if (text) {
        turns.push({ role: "assistant", text });
      }
    }
  }

  return turns.slice(-MAX_TURNS);
}

export function countUserTurns(turns: readonly TitleTurn[]): number {
  return turns.filter((turn) => turn.role === "user").length;
}

export function formatTitleTurnsForPrompt(turns: readonly TitleTurn[]): string {
  return turns
    .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.text}`)
    .join("\n");
}
