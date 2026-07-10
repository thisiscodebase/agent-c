"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEveAgent } from "eve/react";
import { useEffect, useRef } from "react";
import type { ThreadRecord } from "#shared/types/thread";
import { consumePendingMessage } from "./use-pending-message";
import { recordStreamEvent } from "./use-stream-log";
import { persistThreadState, resumeOptionsFromThread } from "./use-thread-state";
import { requestThreadTitleGeneration } from "./use-thread-title";

/**
 * Wraps `eve/react`'s `useEveAgent` for one chat thread.
 *
 * Session config (`initialSession`/`initialEvents`) is only read once, when
 * the hook's store is created — so the caller MUST mount the component that
 * calls this hook with `key={chatId}`, e.g. `<ChatPageClient key={chatId} .../>`.
 * Without that, switching threads will keep showing the first thread's session.
 */
export function useChatSession(chatId: string, initialThread?: ThreadRecord) {
  const queryClient = useQueryClient();
  const resumeOptions = initialThread ? resumeOptionsFromThread(initialThread) : {};

  const agent = useEveAgent({
    initialSession: resumeOptions.initialSession,
    initialEvents: resumeOptions.initialEvents,
    onFinish: (snapshot) => {
      void (async () => {
        await persistThreadState(chatId, snapshot, queryClient);

        const userCount = snapshot.data.messages.filter(
          (message) => message.role === "user" && !message.metadata?.optimistic,
        ).length;

        // Cadence only; server dedupes via titleMeta.
        if (userCount === 1 || userCount % 4 === 0) {
          void requestThreadTitleGeneration(chatId, { mode: "refine" }, queryClient);
        }
      })();
    },
    onEvent: (event) => {
      recordStreamEvent(event.type);
    },
  });

  const sentPendingRef = useRef(false);
  useEffect(() => {
    if (sentPendingRef.current) return;
    sentPendingRef.current = true;
    const pending = consumePendingMessage(chatId);
    if (pending) void agent.send({ message: pending });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const isBusy = agent.status === "submitted" || agent.status === "streaming";

  return { agent, isBusy };
}
