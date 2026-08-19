"use client";

import type { EveAgentReducerEvent } from "eve/react";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import type { OrbState } from "~/components/ui/agent-orb";
import { reduceLiveSubagentOrbStates } from "~/lib/subagent-orb";

const LiveSubagentActivityContext = createContext<ReadonlyMap<string, OrbState>>(
  new Map(),
);

export function LiveSubagentActivityProvider({
  events,
  children,
}: {
  events?: readonly EveAgentReducerEvent[];
  children: ReactNode;
}) {
  const value = useMemo(
    () => reduceLiveSubagentOrbStates(events ?? []),
    [events],
  );

  return (
    <LiveSubagentActivityContext.Provider value={value}>
      {children}
    </LiveSubagentActivityContext.Provider>
  );
}

export function useLiveSubagentOrbState(callId: string): OrbState | undefined {
  return useContext(LiveSubagentActivityContext).get(callId);
}
