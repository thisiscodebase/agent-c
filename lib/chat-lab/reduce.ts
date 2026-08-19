import {
  defaultMessageReducer,
  type EveAgentReducerEvent,
  type EveMessage,
  type EveMessageData,
} from "eve/react";
import { reconcileEventLog } from "./reconcile.ts";

const reducer = defaultMessageReducer();

/** Reduce a reconciled event prefix into Eve message projection. */
export function reduceEventPrefix(
  events: readonly EveAgentReducerEvent[],
): EveMessageData {
  const reconciled = reconcileEventLog(events);
  let data = reducer.initial();
  for (const event of reconciled) {
    data = reducer.reduce(data, event);
  }
  return data;
}

export function messagesAtIndex(
  events: readonly EveAgentReducerEvent[],
  index: number,
): readonly EveMessage[] {
  const clamped = Math.max(0, Math.min(index, events.length));
  return reduceEventPrefix(events.slice(0, clamped)).messages;
}
