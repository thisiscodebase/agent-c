"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { InputResponse } from "eve/client";
import { useEveAgent } from "eve/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AgentPrefs } from "#shared/agent-modes";
import { DEFAULT_AGENT_PREFS, normalizeAgentPrefs } from "#shared/agent-modes";
import type { ThreadRecord } from "#shared/types/thread";
import { installEveStoreSubscribeThrottle } from "~/lib/eve-store-subscribe-throttle";
import {
  chatFailureFromEvent,
  showChatErrorToast,
} from "~/lib/show-chat-error-toast";
import { useLiveResume } from "./use-live-resume";
import { consumePendingMessage } from "./use-pending-message";
import { recordStreamEvent } from "./use-stream-log";
import {
  persistSessionCursor,
  persistThreadState,
  resumeOptionsFromThread,
} from "./use-thread-state";
import { requestThreadTitleGeneration } from "./use-thread-title";

// Coalesce `message.appended` ticks so React doesn't hit error #185 mid-stream.
installEveStoreSubscribeThrottle();

export const AGENT_MODE_HEADER = "x-agent-c-mode";
export const AGENT_REASONING_HEADER = "x-agent-c-reasoning";
export const AGENT_THREAD_ID_HEADER = "x-agent-c-thread-id";

export type UseChatSessionOptions = {
  readOnly?: boolean;
  agentPrefs?: AgentPrefs;
  /**
   * After a live-stream attach catches up to a turn boundary, the parent should
   * remount this hook with the hydrated thread (`key` + `initialThread`).
   */
  onLiveResumeSettled?: (thread: ThreadRecord) => void;
};

/**
 * Wraps `eve/react`'s `useEveAgent` for one chat thread.
 *
 * Session config (`initialSession`/`initialEvents`) is only read once, when
 * the hook's store is created — so the caller MUST mount the component that
 * calls this hook with `key={chatId}`, e.g. `<ChatPageClient key={chatId} .../>`.
 * Without that, switching threads will keep showing the first thread's session.
 *
 * `useEveAgent` hydrates history on load but does not follow an in-flight turn.
 * When Postgres still shows an open turn (or a session-only husk), a second
 * Eve client attaches with `snapshot()` + `session.stream()` so refresh / other
 * devices keep receiving live events.
 */
export function useChatSession(
  chatId: string,
  initialThread?: ThreadRecord,
  options?: UseChatSessionOptions,
) {
  const queryClient = useQueryClient();
  const readOnly = options?.readOnly ?? false;
  const agentPrefs = normalizeAgentPrefs(options?.agentPrefs ?? DEFAULT_AGENT_PREFS);
  const agentPrefsRef = useRef(agentPrefs);
  const persistedSessionIdRef = useRef<string | undefined>(
    initialThread?.state?.session?.sessionId,
  );

  useLayoutEffect(() => {
    agentPrefsRef.current = agentPrefs;
  }, [agentPrefs]);

  const resumeOptions = initialThread ? resumeOptionsFromThread(initialThread) : {};
  const [streamFailure, setStreamFailure] = useState<Error | undefined>(undefined);

  const headers = useCallback(() => ({
    [AGENT_MODE_HEADER]: agentPrefsRef.current.mode,
    [AGENT_REASONING_HEADER]: agentPrefsRef.current.reasoning,
    [AGENT_THREAD_ID_HEADER]: chatId,
  }), [chatId]);

  const agent = useEveAgent({
    initialSession: resumeOptions.initialSession,
    initialEvents: resumeOptions.initialEvents,
    headers,
    onSessionChange: (session) => {
      if (readOnly || !session?.sessionId) {
        return;
      }
      if (persistedSessionIdRef.current === session.sessionId) {
        return;
      }
      persistedSessionIdRef.current = session.sessionId;
      void persistSessionCursor(
        chatId,
        session,
        queryClient,
        agentPrefsRef.current,
      ).catch((error) => {
        console.error("[agent-c persist] session cursor failed", { chatId, error });
      });
    },
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
          console.error("[agent-c persist] onFinish failed", { chatId, error });
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

  const live = useLiveResume({
    chatId,
    thread: initialThread,
    headers,
    persist: !readOnly,
    agentPrefs,
    queryClient,
    onSettled: options?.onLiveResumeSettled,
  });

  // Clear banner when a new turn starts.
  useEffect(() => {
    if (agent.status === "submitted" || agent.status === "streaming" || live.active) {
      setStreamFailure(undefined);
    }
  }, [agent.status, live.active]);

  // Best-effort save if the tab hides/unloads — including mid-stream so we at
  // least keep sessionId + whatever events the client already has.
  useEffect(() => {
    if (readOnly) {
      return;
    }

    function flush() {
      if (live.active) {
        return;
      }
      const streaming =
        agent.status === "submitted" || agent.status === "streaming";
      void persistThreadState(
        chatId,
        agent,
        queryClient,
        agentPrefsRef.current,
        { keepalive: true, skipInvalidate: streaming },
      ).catch((error) => {
        console.error("[agent-c persist] client flush failed", { chatId, error });
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
  }, [agent, chatId, live.active, queryClient, readOnly]);

  const sentPendingRef = useRef(false);
  useLayoutEffect(() => {
    if (readOnly) return;
    if (sentPendingRef.current) return;
    sentPendingRef.current = true;
    const pending = consumePendingMessage(chatId);
    if (pending && !live.active) void agent.send(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, live.active, readOnly]);

  const cancel = useCallback(async () => {
    if (live.active) {
      await live.cancel();
      return;
    }
    await agent.cancel();
  }, [agent, live]);

  const respond = useCallback(async (responses: readonly InputResponse[]) => {
    if (live.active) {
      await live.respond(responses);
      return;
    }
    await agent.respond(responses);
  }, [agent, live]);

  const displayAgent = useMemo(() => ({
    ...agent,
    data: live.messages
      ? { ...agent.data, messages: live.messages }
      : agent.data,
    events: live.events ?? agent.events,
    status: live.status ?? agent.status,
    cancel,
    respond,
  }), [agent, cancel, live.events, live.messages, live.status, respond]);

  const displayStatus = displayAgent.status;
  const isBusy = displayStatus === "submitted" || displayStatus === "streaming";
  const error = live.error ?? streamFailure ?? agent.error;

  return { agent: displayAgent, error, isBusy };
}
