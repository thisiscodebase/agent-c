"use client";

import type { EveToolPart } from "eve/react";
import { toolErrorText, toolHasOpenInteraction, toolInput, toolIsFinished, toolIsRunning, toolOutput } from "~/lib/eve-tool";
import {
  asToolInputs,
  collapseStatefulToolCalls,
  getSubagentTask,
  getToolDisplayInfo,
  resolveSubagentName,
  serializeToolOutput,
  STATEFUL_TOOL_CATEGORIES,
} from "~/lib/tool-call-display";
import { AgentActivitySection } from "~/components/ui/agent-activity-section";
import type {
  ActivityItem,
  ActivityStep,
  LiveSubagent,
  LiveTool,
  ReasoningStep,
  ToolCallEntry,
} from "./activity-types";
import { ToolPart } from "./tool-part";

function isInteractiveTool(part: EveToolPart): boolean {
  if (part.name === "save_memory") return true;
  if (part.name === "create_artifact") return true;
  if (part.state === "approval" || toolHasOpenInteraction(part)) return true;
  return false;
}

function toToolCallEntry(part: EveToolPart): ToolCallEntry {
  const input = toolInput(part);
  const display = getToolDisplayInfo(part.name, input);

  return {
    tool_name: part.name,
    tool_category: display.category,
    message: display.completedLabel,
    show_category: display.showCategory,
    tool_call_id: part.callId,
    inputs: asToolInputs(input),
    output: serializeToolOutput(toolOutput(part), toolErrorText(part)),
    integration_name: display.integrationName,
  };
}

function buildTimelineSteps(items: ActivityItem[]): ActivityStep[] {
  const steps: ActivityStep[] = [];
  let pendingTools: ToolCallEntry[] = [];

  const flushPendingTools = () => {
    const collapsed = collapseStatefulToolCalls(pendingTools);
    for (const entry of collapsed) {
      steps.push({ kind: "tool", entry });
    }
    pendingTools = [];
  };

  for (const item of items) {
    if (item.kind === "reasoning") {
      if (item.part.state === "streaming") continue;
      if (!item.part.text.trim()) continue;
      flushPendingTools();
      steps.push({
        kind: "reasoning",
        step: {
          id: `reasoning-${item.index}`,
          text: item.part.text,
          isStreaming: false,
        },
      });
      continue;
    }

    const part = item.part;
    if (isInteractiveTool(part)) continue;

    if (toolIsFinished(part)) {
      const entry = toToolCallEntry(part);
      const prev = pendingTools.at(-1);
      if (
        prev &&
        STATEFUL_TOOL_CATEGORIES.has(entry.tool_category) &&
        prev.tool_category === entry.tool_category
      ) {
        pendingTools[pendingTools.length - 1] = entry;
      } else {
        pendingTools.push(entry);
      }
    }
  }

  flushPendingTools();
  return steps;
}

function getLiveState(items: ActivityItem[]): {
  liveReasoning: ReasoningStep | null;
  liveTool: LiveTool | null;
  liveSubagents: LiveSubagent[];
} {
  let liveReasoning: ReasoningStep | null = null;
  let liveTool: LiveTool | null = null;
  const liveSubagents: LiveSubagent[] = [];

  for (const item of items) {
    if (item.kind === "reasoning" && item.part.state === "streaming") {
      liveReasoning = {
        id: `reasoning-live-${item.index}`,
        text: item.part.text,
        isStreaming: true,
      };
    }
    if (item.kind === "tool" && !isInteractiveTool(item.part)) {
      if (toolIsRunning(item.part)) {
        const input = toolInput(item.part);
        const display = getToolDisplayInfo(item.part.name, input);
        if (display.category === "handoff" || item.part.kind === "agent") {
          liveSubagents.push({
            id: item.part.callId,
            name: resolveSubagentName(item.part.name, item.part.name),
            task: getSubagentTask(input),
          });
        } else {
          liveTool = {
            category: display.category,
            label: display.runningLabel,
          };
        }
      }
    }
  }

  return { liveReasoning, liveTool, liveSubagents };
}

/**
 * Progressive disclosure for reasoning + tool calls in chronological order.
 */
export function AgentActivityGroup({
  items,
  onRespond,
}: {
  items: ActivityItem[];
  onRespond: (requestId: string, optionId: string) => void;
}) {
  const interactive = items.filter(
    (item): item is Extract<ActivityItem, { kind: "tool" }> =>
      item.kind === "tool" && isInteractiveTool(item.part),
  );

  const steps = buildTimelineSteps(items);
  const { liveReasoning, liveTool, liveSubagents } = getLiveState(items);

  return (
    <div className="flex w-full flex-col gap-0.5">
      <AgentActivitySection
        liveReasoning={liveReasoning}
        liveSubagents={liveSubagents}
        liveTool={liveTool}
        steps={steps}
      />
      {interactive.map((item) => (
        <ToolPart key={item.part.callId} onRespond={onRespond} part={item.part} />
      ))}
    </div>
  );
}
