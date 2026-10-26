"use client";

import type { ConversationAgentSession } from "eve/react";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import {
  activityFromFollowedSession,
  type FollowedSubagentActivity,
} from "~/lib/subagent-orb";

const LiveSubagentActivityContext = createContext<
  ReadonlyMap<string, FollowedSubagentActivity>
>(new Map());

export function LiveSubagentActivityProvider({
  agents,
  children,
}: {
  /** Followed child sessions from `conversation.agents`, keyed by child session id. */
  agents?: Readonly<Record<string, ConversationAgentSession>>;
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const activity = new Map<string, FollowedSubagentActivity>();
    if (!agents) return activity;
    for (const session of Object.values(agents)) {
      const next = activityFromFollowedSession(session);
      if (next) activity.set(session.callId, next);
    }
    return activity;
  }, [agents]);

  return (
    <LiveSubagentActivityContext.Provider value={value}>
      {children}
    </LiveSubagentActivityContext.Provider>
  );
}

export function useLiveSubagentActivity(
  callId: string,
): FollowedSubagentActivity | undefined {
  return useContext(LiveSubagentActivityContext).get(callId);
}
