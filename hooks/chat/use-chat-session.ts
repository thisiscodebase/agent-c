"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEveAgent } from "eve/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AgentPrefs } from "#shared/agent-modes";
import { DEFAULT_AGENT_PREFS, normalizeAgentPrefs } from "#shared/agent-modes";
import type { ThreadRecord } from "#shared/types/thread";
import {
  chatFailureFromEvent,
  showChatErrorToast,
} from "~/lib/show-chat-error-toast";
import { consumePendingMessage } from "./use-pending-message";
import { recordStreamEvent } from "./use-stream-log";
import { persistThreadState, resumeOptionsFromThread } from "./use-thread-state";
import { requestThreadTitleGeneration } from "./use-thread-title";

export const AGENT_MODE_HEADER = "x-agent-c-mode";
export const AGENT_REASONING_HEADER = "x-agent-c-reasoning";

/**
 * Wraps `eve/react`'s `useEveAgent` for one chat thread.
 *
 * Session config (`initialSession`/`initialEvents`) is only read once, when
 * the hook's store is created — so the caller MUST mount the component that
 * calls this hook with `key={chatId}`, e.g. `<ChatPageClient key={chatId} .../>`.
 * Without that, switching threads will keep showing the first thread's session.
 */
export function useChatSession(
  chatId: string,
  initialThread?: ThreadRecord,
  options?: { readOnly?: boolean; agentPrefs?: AgentPrefs },
) {
  const queryClient = useQueryClient();
  const readOnly = options?.readOnly ?? false;
  const agentPrefs = normalizeAgentPrefs(options?.agentPrefs ?? DEFAULT_AGENT_PREFS);
  const agentPrefsRef = useRef(agentPrefs);

  useLayoutEffect(() => {
    agentPrefsRef.current = agentPrefs;
  }, [agentPrefs]);

  const resumeOptions = initialThread ? resumeOptionsFromThread(initialThread) : {};
  const [streamFailure, setStreamFailure] = useState<Error | undefined>(undefined);

  const agent = useEveAgent({
    initialSession: resumeOptions.initialSession,
    initialEvents: resumeOptions.initialEvents,
    headers: () => ({
      [AGENT_MODE_HEADER]: agentPrefsRef.current.mode,
      [AGENT_REASONING_HEADER]: agentPrefsRef.current.reasoning,
    }),
    onFinish: (snapshot) => {
      if (readOnly) {
        return;
      }
      void (async () => {
        try {
          await persistThreadState(
            chatId,
            snapshot,
            queryClient,
            agentPrefsRef.current,
          );
        }
        catch (error) {
          console.error("[persist-thread] onFinish failed", { chatId, error });
          showChatErrorToast(
            error instanceof Error ? error : new Error("Failed to save chat"),
            chatId,
            { source: "persistThreadState" },
          );
        }

        const userCount = snapshot.data.messages.filter(
          (message) => message.role === "user" && !message.metadata?.optimistic,
        ).length;

        // Cadence only; server dedupes via titleMeta.
        if (userCount === 1 || userCount % 4 === 0) {
          void requestThreadTitleGeneration(chatId, { mode: "refine" }, queryClient);
        }
      })();
    },
    onError: (error) => {
      setStreamFailure(error);
      showChatErrorToast(error, chatId, { source: "agent.onError" });
    },
    onEvent: (event) => {
      recordStreamEvent(event.type);

      // Eve parks many model failures as turn.failed + session.waiting without
      // setting agent.error (that only follows session.failed / thrown errors).
      if (event.type === "turn.failed") {
        const failure = chatFailureFromEvent({
          code: event.data.code,
          message: event.data.message,
          details: event.data.details,
          turnId: event.data.turnId,
          source: event.type,
        });
        setStreamFailure(failure);
        showChatErrorToast(failure, chatId, {
          code: event.data.code,
          details: event.data.details,
          source: event.type,
          turnId: event.data.turnId,
        });
      }
    },
  });

  // Clear banner when a new turn starts.
  useEffect(() => {
    if (agent.status === "submitted" || agent.status === "streaming") {
      setStreamFailure(undefined);
    }
  }, [agent.status]);

  // Best-effort save if the tab hides/unloads before onFinish settles.
  useEffect(() => {
    if (readOnly) {
      return;
    }

    function flush() {
      if (agent.status === "submitted" || agent.status === "streaming") {
        return;
      }
      void persistThreadState(
        chatId,
        agent,
        queryClient,
        agentPrefsRef.current,
      ).catch((error) => {
        console.error("[persist-thread] flush failed", { chatId, error });
      });
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        flush();
      }
    }

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [agent, chatId, queryClient, readOnly]);

  const sentPendingRef = useRef(false);
  useEffect(() => {
    if (readOnly) return;
    if (sentPendingRef.current) return;
    sentPendingRef.current = true;
    const pending = consumePendingMessage(chatId);
    if (pending) void agent.send({ message: pending });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, readOnly]);

  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const error = streamFailure ?? agent.error;

  return { agent, error, isBusy };
}
