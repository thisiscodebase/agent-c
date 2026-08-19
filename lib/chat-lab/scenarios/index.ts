import type { ChatLabScenario } from "../types.ts";
import { artifactScenario } from "./artifact.ts";
import { companiesHouseScenario } from "./companies-house.ts";
import { errorScenario } from "./error.ts";
import { hitlMemoryScenario } from "./hitl-memory.ts";
import { plainStreamScenario } from "./plain-stream.ts";
import { reasoningToolsScenario } from "./reasoning-tools.ts";
import { subagentScenario } from "./subagent.ts";

export const CHAT_LAB_SCENARIOS: readonly ChatLabScenario[] = [
  plainStreamScenario,
  reasoningToolsScenario,
  subagentScenario,
  companiesHouseScenario,
  artifactScenario,
  hitlMemoryScenario,
  errorScenario,
];

export function getChatLabScenario(id: string | null | undefined): ChatLabScenario {
  const match = CHAT_LAB_SCENARIOS.find((scenario) => scenario.id === id);
  return match ?? plainStreamScenario;
}

export {
  artifactScenario,
  companiesHouseScenario,
  errorScenario,
  hitlMemoryScenario,
  plainStreamScenario,
  reasoningToolsScenario,
  subagentScenario,
};
