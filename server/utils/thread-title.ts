import { generateText } from "ai";
import { truncateThreadTitle } from "#shared/types/thread";
import { resolveNanoModelSelection } from "~~/server/utils/model-routing";
import {
  formatTitleTurnsForPrompt,
  type TitleTurn,
} from "~~/server/utils/thread-title-turns";

const TITLE_SYSTEM = `You write short chat thread titles for a sidebar.
Rules:
- 3 to 7 words
- Capture the topic, not a full sentence
- No quotes, no trailing punctuation, no emoji
- Prefer Title Case
- Return only the title text`;

function cleanGeneratedTitle(raw: string): string | undefined {
  const line = raw
    .trim()
    .split("\n")[0]
    ?.trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[.!?]+$/g, "")
    .trim();

  if (!line) {
    return undefined;
  }

  return truncateThreadTitle(line, 50);
}

export async function generateThreadTitleFromTurns(
  turns: readonly TitleTurn[],
  options?: { userId?: string },
): Promise<string | undefined> {
  if (turns.length === 0) {
    return undefined;
  }

  const selection = await resolveNanoModelSelection(options?.userId);
  const transcript = formatTitleTurnsForPrompt(turns);
  const { text } = await generateText({
    model: selection.model,
    system: TITLE_SYSTEM,
    prompt: `Conversation:\n${transcript}\n\nTitle:`,
    maxOutputTokens: 40,
    temperature: 0.3,
    providerOptions: {
      gateway: selection.gateway,
    },
  });

  return cleanGeneratedTitle(text);
}

export async function generateThreadTitleFromSeed(
  seedText: string,
  options?: { userId?: string },
): Promise<string | undefined> {
  return generateThreadTitleFromTurns(
    [{ role: "user", text: seedText.trim().slice(0, 400) }],
    options,
  );
}
