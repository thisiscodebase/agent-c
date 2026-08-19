"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { ChatStatus } from "ai";
import {
  Client,
  type ClientSession,
  type ClientSessionState,
  type InputResponse,
  type MessageStreamEvent,
} from "eve/client";
import type { EveMessage } from "eve/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgentPrefs } from "#shared/agent-modes";
import {
  appendUniqueStreamEvent,
  getOpenTurnId,
  isTurnBoundaryEvent,
  mergeStreamEventLogs,
  shouldResumeLiveStream,
} from "#shared/live-resume";
import type { ThreadRecord } from "#shared/types/thread";
import { reduceEventPrefix } from "~/lib/chat-lab/reduce";
import { deriveChatStatus } from "~/lib/chat-lab/status";
import { EVE_STREAM_UI_THROTTLE_MS } from "~/lib/eve-store-subscribe-throttle";
import {
  chatFailureFromEvent,
  showChatErrorToast,
} from "~/lib/show-chat-error-toast";
import { recordStreamEvent } from "./use-stream-log";
import { persistLiveResumeState } from "./use-thread-state";

const IDLE_RETRY_MS = 400;
const IDLE_RETRY_MAX_MS = 2_000;

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function persistedEvents(thread: ThreadRecord | undefined): MessageStreamEvent[] {
  const events = thread?.state?.events;
  if (!events?.length) {
    return [];
  }
  return events as MessageStreamEvent[];
}

function asStreamEvents(events: readonly unknown[]): MessageStreamEvent[] {
  return events as MessageStreamEvent[];
}

function threadWithLiveState(
  thread: ThreadRecord,
  session: ClientSessionState,
  events: readonly unknown[],
  agentPrefs?: AgentPrefs,
): ThreadRecord {
  return {
    ...thread,
    updatedAt: Date.now(),
    state: {
      session: {
        sessionId: session.sessionId,
        streamIndex: session.streamIndex,
      },
      events: [...events],
      source: "web",
      titleMeta: thread.state?.titleMeta,
      agentPrefs: agentPrefs ?? thread.state?.agentPrefs,
    },
  };
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function useLiveResume(input: {
  chatId: string;
  thread?: ThreadRecord;
  headers: () => Readonly<Record<string, string>>;
  persist: boolean;
  agentPrefs: AgentPrefs;
  queryClient: QueryClient;
  onSettled?: (thread: ThreadRecord) => void;
}) {
  const { chatId, thread, persist, queryClient, onSettled } = input;
  const sessionId = thread?.state?.session?.sessionId;
  const wantsResume = Boolean(
    sessionId && shouldResumeLiveStream({ sessionId, events: thread?.state?.events }),
  );

  const [events, setEvents] = useState<MessageStreamEvent[] | undefined>(
    () => (wantsResume ? persistedEvents(thread) : undefined),
  );
  const [failure, setFailure] = useState<Error | undefined>(undefined);
  const [active, setActive] = useState(wantsResume);

  const eventsRef = useRef<MessageStreamEvent[]>(events ?? []);
  const sessionRef = useRef<ClientSession | undefined>(undefined);
  const cursorRef = useRef(0);
  const publishTimerRef = useRef<number | null>(null);
  const headersRef = useRef(input.headers);
  const prefsRef = useRef(input.agentPrefs);
  const persistRef = useRef(persist);
  const onSettledRef = useRef(onSettled);
  const threadRef = useRef(thread);
  const startedRef = useRef(false);
  const abortedRef = useRef(false);

  headersRef.current = input.headers;
  prefsRef.current = input.agentPrefs;
  persistRef.current = persist;
  onSettledRef.current = onSettled;
  threadRef.current = thread;

  const publish = useCallback((next: MessageStreamEvent[]) => {
    eventsRef.current = next;
    if (publishTimerRef.current !== null) {
      return;
    }
    publishTimerRef.current = window.setTimeout(() => {
      publishTimerRef.current = null;
      setEvents(eventsRef.current);
    }, EVE_STREAM_UI_THROTTLE_MS);
  }, []);

  const flushPublish = useCallback(() => {
    if (publishTimerRef.current !== null) {
      window.clearTimeout(publishTimerRef.current);
      publishTimerRef.current = null;
    }
    setEvents(eventsRef.current);
  }, []);

  const persistAndSettle = useCallback(async (
    session: ClientSessionState,
    nextEvents: readonly MessageStreamEvent[],
  ) => {
    const current = threadRef.current;
    if (!current) {
      return;
    }
    const nextThread = threadWithLiveState(
      current,
      session,
      nextEvents,
      prefsRef.current,
    );
    if (persistRef.current) {
      try {
        await persistLiveResumeState(
          chatId,
          {
            session,
            events: nextEvents,
            agentPrefs: prefsRef.current,
          },
          queryClient,
        );
      }
      catch (error) {
        console.error("[agent-c persist] live resume persist failed", { chatId, error });
      }
    }
    if (abortedRef.current) {
      return;
    }
    setActive(false);
    onSettledRef.current?.(nextThread);
  }, [chatId, queryClient]);

  useEffect(() => {
    if (!wantsResume || !sessionId || startedRef.current) {
      return;
    }
    const currentThread = threadRef.current;
    if (!currentThread) {
      return;
    }
    startedRef.current = true;
    abortedRef.current = false;

    const abort = new AbortController();
    const client = new Client({
      host: "",
      headers: () => headersRef.current(),
    });
    const session = client.sessions.attach(sessionId);
    sessionRef.current = session;
    eventsRef.current = persistedEvents(currentThread);
    setActive(true);

    void (async () => {
      try {
        const snapshot = await session.snapshot({ signal: abort.signal });
        if (abort.signal.aborted) {
          return;
        }

        let nextEvents = mergeStreamEventLogs(
          eventsRef.current,
          asStreamEvents(snapshot.events),
        );
        eventsRef.current = nextEvents;
        flushPublish();

        cursorRef.current = snapshot.session.streamIndex;

        if (!shouldResumeLiveStream({ sessionId, events: nextEvents })) {
          await persistAndSettle(snapshot.session, nextEvents);
          return;
        }

        let cursor = snapshot.session.streamIndex;
        let idleMs = IDLE_RETRY_MS;

        while (!abort.signal.aborted) {
          let yielded = 0;
          let settled: ClientSessionState | undefined;

          for await (const event of session.stream({
            startIndex: cursor,
            signal: abort.signal,
          })) {
            yielded += 1;
            cursor += 1;
            cursorRef.current = cursor;
            nextEvents = appendUniqueStreamEvent(nextEvents, event);
            eventsRef.current = nextEvents;
            recordStreamEvent(event.type);
            publish(nextEvents);

            if (event.type === "turn.failed") {
              const failure = chatFailureFromEvent({
                code: event.data.code,
                message: event.data.message,
                details: event.data.details,
                turnId: event.data.turnId,
                source: event.type,
              });
              setFailure(failure);
              showChatErrorToast(failure, chatId, {
                code: event.data.code,
                details: event.data.details,
                source: "liveResume",
                turnId: event.data.turnId,
              });
            }

            if (isTurnBoundaryEvent(event)) {
              settled = {
                sessionId,
                streamIndex: cursor,
              };
              break;
            }
          }

          if (abort.signal.aborted) {
            return;
          }

          if (settled) {
            flushPublish();
            await persistAndSettle(settled, nextEvents);
            return;
          }

          if (yielded === 0) {
            await sleep(idleMs, abort.signal);
            idleMs = Math.min(idleMs * 2, IDLE_RETRY_MAX_MS);
          }
          else {
            idleMs = IDLE_RETRY_MS;
          }
        }
      }
      catch (error) {
        if (abort.signal.aborted || isAbortError(error)) {
          return;
        }
        const failure = error instanceof Error
          ? error
          : new Error("Failed to resume live stream");
        setFailure(failure);
        showChatErrorToast(failure, chatId, { source: "liveResume" });
        setActive(false);
      }
    })();

    return () => {
      abortedRef.current = true;
      abort.abort();
      sessionRef.current = undefined;
      if (publishTimerRef.current !== null) {
        window.clearTimeout(publishTimerRef.current);
        publishTimerRef.current = null;
      }
    };
  }, [
    chatId,
    flushPublish,
    persistAndSettle,
    publish,
    sessionId,
    wantsResume,
  ]);

  useEffect(() => {
    if (!persist || !active) {
      return;
    }

    function flush() {
      const current = threadRef.current;
      if (!current || !sessionId || eventsRef.current.length === 0) {
        return;
      }
      void persistLiveResumeState(
        chatId,
        {
          session: {
            sessionId,
            streamIndex: cursorRef.current,
          },
          events: eventsRef.current,
          agentPrefs: prefsRef.current,
        },
        queryClient,
        { keepalive: true, skipInvalidate: true },
      ).catch((error) => {
        console.error("[agent-c persist] live resume flush failed", { chatId, error });
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
  }, [active, chatId, persist, queryClient, sessionId]);

  const cancel = useCallback(async () => {
    const turnId = getOpenTurnId(eventsRef.current);
    if (!sessionId) {
      return;
    }
    const handle = sessionRef.current
      ?? new Client({ host: "", headers: () => headersRef.current() })
        .sessions.attach(sessionId);
    await handle.cancel(turnId ? { turnId } : undefined);
  }, [sessionId]);

  const respond = useCallback(async (responses: readonly InputResponse[]) => {
    if (!sessionId) {
      return;
    }
    const handle = new Client({
      host: "",
      headers: () => headersRef.current(),
    }).sessions.attach(sessionId, { streamIndex: cursorRef.current });
    const response = await handle.respond([...responses]);
    void (async () => {
      try {
        for await (const event of response) {
          if (isTurnBoundaryEvent(event)) {
            break;
          }
        }
      }
      catch {
        // Overlay follow loop is the UI source of truth.
      }
    })();
  }, [sessionId]);

  const displayEvents = active ? events : undefined;
  const messages = useMemo<readonly EveMessage[] | undefined>(() => {
    if (!displayEvents) {
      return undefined;
    }
    return reduceEventPrefix(displayEvents).messages;
  }, [displayEvents]);
  const status = useMemo<ChatStatus | undefined>(() => {
    if (!displayEvents) {
      return undefined;
    }
    if (displayEvents.length === 0) {
      return "submitted";
    }
    return deriveChatStatus(displayEvents);
  }, [displayEvents]);

  return {
    active,
    events: displayEvents,
    messages,
    status,
    error: failure,
    cancel,
    respond,
  };
}
