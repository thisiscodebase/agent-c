import type {
  ConversationAgentSession,
  EveAgentReducerEvent,
  EveMessage,
} from "eve/react";
import type { OrbState } from "thinking-orbs";
import { getToolDisplayInfo } from "./tool-call-display.ts";

const SEARCH_CATEGORIES = new Set([
  "web_search",
  "web_fetch",
  "retrieve_tools",
  "slack",
  "hubspot",
  "notion",
  "drive",
  "tally",
  "asana",
  "retool",
  "platform",
  "companies_house",
  "eventbrite",
]);

const SHAPE_CATEGORIES = new Set(["memory", "todos"]);

/** Hue-rotate offsets that land off the branded orange fruit ink. */
const SUBAGENT_HUE_ROTATES = [95, 135, 175, 210, 250, 290] as const;

type RequestedAction = Extract<
  EveAgentReducerEvent,
  { type: "actions.requested" }
>["data"]["actions"][number];

type ActionResult = Extract<
  EveAgentReducerEvent,
  { type: "action.result" }
>["data"]["result"];

export function orbStateForCategory(category: string): OrbState {
  if (category === "handoff") return "weaving";
  if (SEARCH_CATEGORIES.has(category)) return "searching";
  if (SHAPE_CATEGORIES.has(category)) return "shaping";
  return "working";
}

/** Pick an orb verb from the subagent's name + assigned task. */
export function orbStateForSubagentTask(name: string, task?: string): OrbState {
  const haystack = `${name} ${task ?? ""}`.toLowerCase();
  if (
    /\b(search|slack|hubspot|notion|drive|web|query|scan|pull|read|crm|docs|platform|tally|asana|retool|companies house|registry)\b/.test(
      haystack,
    )
  ) {
    return "searching";
  }
  if (/\b(write|draft|compos|document|artifact|case study)\b/.test(haystack)) {
    return "composing";
  }
  if (/\b(reason|think|solv|analy|plan)\b/.test(haystack)) {
    return "solving";
  }
  if (/\b(connect|auth|oauth)\b/.test(haystack)) {
    return "connecting";
  }
  if (/\b(todo|memory)\b/.test(haystack)) {
    return "shaping";
  }
  return "working";
}

/** Live orb plus the child's current tool label, when a followed session has one. */
export type FollowedSubagentActivity = {
  orb: OrbState;
  toolLabel?: string;
};

function childToolActivity(part: Extract<EveMessage["parts"][number], { type: "dynamic-tool" }>): FollowedSubagentActivity | undefined {
  switch (part.state) {
    case "input-streaming":
    case "input-available":
    case "approval-requested":
    case "approval-responded":
      break;
    case "output-available":
      if (part.partial !== true) return undefined;
      break;
    case "output-error":
    case "output-denied":
      return undefined;
    default: {
      const _never: never = part;
      return _never;
    }
  }
  const info = getToolDisplayInfo(part.toolName, part.input);
  return {
    orb: orbStateForCategory(info.category),
    toolLabel: info.runningLabel,
  };
}

function followedConversation(session: ConversationAgentSession) {
  switch (session.observation.status) {
    case "following":
    case "idle":
      return session.observation.conversation;
    case "unavailable":
      return session.observation.conversation;
    case "not-followed":
      return undefined;
    default: {
      const _never: never = session.observation;
      return _never;
    }
  }
}

/** Latest live signal on one assistant message. Later parts win. */
function activityFromAssistantMessage(message: EveMessage): FollowedSubagentActivity | undefined {
  let activity: FollowedSubagentActivity | undefined;
  for (const part of message.parts) {
    if (part.type === "reasoning" && part.state === "streaming") {
      activity = { orb: "solving" };
      continue;
    }
    if (part.type === "text" && part.state === "streaming") {
      activity = { orb: "composing" };
      continue;
    }
    if (part.type === "dynamic-tool") {
      const tool = childToolActivity(part);
      if (tool) activity = tool;
    }
  }
  return activity;
}

/**
 * Orb and tool label from a followed child conversation.
 * Returns undefined when the child is not followed yet, so the row can fall
 * back to `orbStateForSubagentTask`.
 */
export function activityFromFollowedSession(
  session: ConversationAgentSession,
): FollowedSubagentActivity | undefined {
  const conversation = followedConversation(session);
  if (!conversation) return undefined;

  let activity: FollowedSubagentActivity | undefined;
  for (const message of conversation.messages) {
    if (message.role !== "assistant") continue;
    const next = activityFromAssistantMessage(message);
    if (next) activity = next;
  }
  return activity;
}

function preferredHueIndex(id: string): number {
  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) % SUBAGENT_HUE_ROTATES.length;
}

function pickUnusedHue(preferredIndex: number, taken: ReadonlySet<number>): number {
  const count = SUBAGENT_HUE_ROTATES.length;
  for (let offset = 0; offset < count; offset += 1) {
    const hue = SUBAGENT_HUE_ROTATES[(preferredIndex + offset) % count]!;
    if (!taken.has(hue)) return hue;
  }
  return SUBAGENT_HUE_ROTATES[preferredIndex]!;
}

/** Stable non-orange hue for a subagent id (may collide across siblings). */
export function subagentOrbHueRotate(id: string): number {
  return SUBAGENT_HUE_ROTATES[preferredHueIndex(id)]!;
}

/**
 * Assign hues without replacement for the live sibling set.
 * Still-live ids keep a previous hue; newcomers take the next free palette slot.
 */
export function assignUniqueSubagentHues(
  ids: readonly string[],
  previous?: ReadonlyMap<string, number>,
): Map<string, number> {
  const next = new Map<string, number>();
  const taken = new Set<number>();

  for (const id of ids) {
    const prev = previous?.get(id);
    if (prev == null) continue;
    next.set(id, prev);
    taken.add(prev);
  }

  for (const id of ids) {
    if (next.has(id)) continue;
    const hue = pickUnusedHue(preferredHueIndex(id), taken);
    next.set(id, hue);
    taken.add(hue);
  }

  return next;
}

function toolNameFromRequestedAction(action: RequestedAction): string {
  switch (action.kind) {
    case "tool-call":
    case "workflow-tool-call":
      return action.toolName;
    case "subagent-call":
      return `eve:subagent:${action.subagentName}`;
    case "remote-agent-call":
      return `eve:subagent:${action.remoteAgentName}`;
    case "load-skill":
      return "eve:load-skill";
    default: {
      const _never: never = action;
      return _never;
    }
  }
}

function toolNameFromActionResult(result: ActionResult): string | undefined {
  if ("toolName" in result && typeof result.toolName === "string") {
    return result.toolName;
  }
  if (result.kind === "subagent-result" && "subagentName" in result) {
    return `eve:subagent:${result.subagentName}`;
  }
  if (result.kind === "load-skill-result") {
    return "eve:load-skill";
  }
  return undefined;
}

/** Map one nested child-stream event to an orb verb. */
export function orbStateFromChildStreamEvent(
  event: EveAgentReducerEvent,
): OrbState | null {
  switch (event.type) {
    case "reasoning.appended":
    case "reasoning.completed":
      return "solving";
    case "message.appended":
    case "message.completed":
      return "composing";
    case "authorization.required":
      return "connecting";
    case "input.requested":
      return "listening";
    case "actions.requested": {
      const action = event.data.actions.at(-1);
      if (!action) return "working";
      return orbStateForCategory(
        getToolDisplayInfo(toolNameFromRequestedAction(action)).category,
      );
    }
    case "action.result": {
      const toolName = toolNameFromActionResult(event.data.result);
      if (!toolName) return "working";
      return orbStateForCategory(getToolDisplayInfo(toolName).category);
    }
    case "action.partial":
      return "working";
    default:
      return null;
  }
}

/**
 * Latest inner orb verb per in-flight subagent call.
 * Parent streams no longer carry child progress (`subagent.event` is gone);
 * a followed child stream can still be mapped with `orbStateFromChildStreamEvent`.
 * `task.settled` and a finished turn drop any tracked call.
 */
export function reduceLiveSubagentOrbStates(
  events: readonly EveAgentReducerEvent[],
): Map<string, OrbState> {
  const states = new Map<string, OrbState>();

  for (const event of events) {
    switch (event.type) {
      case "task.settled":
        states.delete(event.data.callId);
        break;
      case "turn.completed":
      case "turn.cancelled":
      case "turn.failed":
        states.clear();
        break;
      default:
        break;
    }
  }

  return states;
}
