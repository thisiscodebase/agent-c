"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { ChatStatus } from "ai";
import type { EveAgentReducerEvent, EveMessage } from "eve/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildCheckpoints,
  createMockArtifact,
  delayForEvent,
  deriveChatStatus,
  extractTurnFailureMessage,
  getChatLabScenario,
  isHitlPauseEvent,
  MOCK_ARTIFACT_ID,
  reduceEventPrefix,
  adjacentCheckpointIndex,
  type ChatLabArtifact,
  type ChatLabCheckpoint,
  type ChatLabSpeed,
  CHAT_LAB_SCENARIOS,
} from "~/lib/chat-lab";
import { queryKeys } from "~/lib/query-keys";

function seedMockArtifacts(
  queryClient: ReturnType<typeof useQueryClient>,
  artifactIds: readonly string[] | undefined,
) {
  const ids = artifactIds?.length ? artifactIds : [];
  for (const id of ids) {
    const artifact: ChatLabArtifact = createMockArtifact({
      id,
      ...(id === MOCK_ARTIFACT_ID ? {} : { title: `Mock artifact ${id}` }),
    });
    queryClient.setQueryData(queryKeys.artifact(id), artifact);
    queryClient.setQueryData<{ artifacts: ChatLabArtifact[] }>(
      queryKeys.artifacts,
      (old) => {
        const existing = old?.artifacts ?? [];
        if (existing.some((entry) => entry.id === id)) {
          return {
            artifacts: existing.map((entry) => (entry.id === id ? artifact : entry)),
          };
        }
        return { artifacts: [artifact, ...existing] };
      },
    );
  }
}

function snapshotFromIndex(
  events: readonly EveAgentReducerEvent[],
  index: number,
  checkpoints: readonly ChatLabCheckpoint[],
) {
  const clamped = Math.max(0, Math.min(index, events.length));
  const prefix = events.slice(0, clamped);
  const messages = reduceEventPrefix(prefix).messages;
  const status = deriveChatStatus(prefix);
  const last = prefix[prefix.length - 1];
  const waitingForHitl = last !== undefined && isHitlPauseEvent(last);

  return {
    messages,
    status,
    events,
    index: clamped,
    currentEventType: last?.type ?? null,
    checkpoints,
    waitingForHitl,
  };
}

export function useMockConversation(initialScenarioId?: string) {
  const queryClient = useQueryClient();
  const [scenarioId, setScenarioId] = useState(
    () => getChatLabScenario(initialScenarioId).id,
  );
  const scenario = useMemo(
    () => getChatLabScenario(scenarioId),
    [scenarioId],
  );
  const [events, setEvents] = useState<EveAgentReducerEvent[]>(() => [
    ...scenario.events,
  ]);
  const checkpoints = useMemo(() => buildCheckpoints(events), [events]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<ChatLabSpeed>(1);
  const [launched, setLaunched] = useState(false);

  const playingRef = useRef(playing);
  const indexRef = useRef(index);
  const eventsRef = useRef(events);
  const speedRef = useRef(speed);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const snapshot = useMemo(
    () => snapshotFromIndex(events, index, checkpoints),
    [checkpoints, events, index],
  );

  const errorMessage = useMemo(
    () =>
      snapshot.status === "error"
        ? extractTurnFailureMessage(events.slice(0, index))
        : undefined,
    [events, index, snapshot.status],
  );

  useEffect(() => {
    seedMockArtifacts(queryClient, scenario.artifactIds);
  }, [queryClient, scenario.artifactIds]);

  const seek = useCallback(
    (nextIndex: number) => {
      clearTimer();
      const clamped = Math.max(0, Math.min(nextIndex, eventsRef.current.length));
      setIndex(clamped);
      setPlaying(false);
      if (clamped > 0) {
        setLaunched(true);
      }
    },
    [clearTimer],
  );

  const step = useCallback(
    (delta: number) => {
      seek(indexRef.current + delta);
    },
    [seek],
  );

  const seekMilestone = useCallback(
    (direction: -1 | 1) => {
      const marks = buildCheckpoints(eventsRef.current);
      seek(
        adjacentCheckpointIndex(
          marks,
          indexRef.current,
          direction,
          eventsRef.current.length,
        ),
      );
    },
    [seek],
  );

  const pause = useCallback(() => {
    clearTimer();
    setPlaying(false);
  }, [clearTimer]);

  const scheduleAdvance = useCallback(() => {
    clearTimer();
    if (!playingRef.current) return;

    const currentIndex = indexRef.current;
    const currentEvents = eventsRef.current;
    if (currentIndex >= currentEvents.length) {
      setPlaying(false);
      return;
    }

    const nextEvent = currentEvents[currentIndex]!;
    const previous = currentIndex > 0 ? currentEvents[currentIndex - 1] : undefined;
    const delay = delayForEvent(nextEvent, previous) / speedRef.current;
    timerRef.current = window.setTimeout(() => {
      const after = currentIndex + 1;
      setIndex(after);
      indexRef.current = after;

      const applied = currentEvents[currentIndex]!;
      if (isHitlPauseEvent(applied)) {
        setPlaying(false);
        playingRef.current = false;
        return;
      }

      if (after >= currentEvents.length) {
        setPlaying(false);
        playingRef.current = false;
        return;
      }

      scheduleAdvance();
    }, Math.max(0, delay));
  }, [clearTimer]);

  const selectScenario = useCallback(
    (id: string) => {
      clearTimer();
      const next = getChatLabScenario(id);
      const nextEvents = [...next.events];
      setScenarioId(next.id);
      setEvents(nextEvents);
      eventsRef.current = nextEvents;
      setIndex(0);
      indexRef.current = 0;
      setPlaying(false);
      playingRef.current = false;
      setLaunched(false);
      seedMockArtifacts(queryClient, next.artifactIds);
    },
    [clearTimer, queryClient],
  );
  const play = useCallback(() => {
    if (indexRef.current >= eventsRef.current.length) {
      setIndex(0);
      indexRef.current = 0;
    }
    setLaunched(true);
    setPlaying(true);
    playingRef.current = true;
    scheduleAdvance();
  }, [scheduleAdvance]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setEvents([...scenario.events]);
    setIndex(0);
    setPlaying(false);
    setLaunched(false);
    seedMockArtifacts(queryClient, scenario.artifactIds);
  }, [clearTimer, queryClient, scenario]);

  const launch = useCallback(
    (message?: string) => {
      clearTimer();
      const text = (message?.trim() || scenario.userMessage).trim();
      // Rebuild from scenario but swap the submitted/received user text if needed.
      const nextEvents = scenario.events.map((event) => {
        if (event.type === "client.message.submitted") {
          return {
            ...event,
            data: { ...event.data, message: text },
          };
        }
        if (event.type === "message.received") {
          return {
            ...event,
            data: {
              ...event.data,
              message: text,
              parts: [{ type: "text" as const, text }],
            },
          };
        }
        return event;
      });
      setEvents(nextEvents);
      setIndex(0);
      setLaunched(true);
      setPlaying(true);
      playingRef.current = true;
      eventsRef.current = nextEvents;
      indexRef.current = 0;
      seedMockArtifacts(queryClient, scenario.artifactIds);
      scheduleAdvance();
    },
    [clearTimer, queryClient, scenario, scheduleAdvance],
  );

  const respond = useCallback(
    (requestId: string, optionId: string) => {
      clearTimer();
      const approved = optionId === "approve";
      const continuation = approved
        ? scenario.afterHitlApprove
        : scenario.afterHitlDeny;

      const responseEvent: EveAgentReducerEvent = {
        type: "client.input.responded",
        data: {
          createdAt: Date.now(),
          responses: [{ requestId, optionId }],
        },
      };

      const base = eventsRef.current.slice(0, indexRef.current);
      const rest = continuation ? [...continuation] : [];
      const nextEvents = [...base, responseEvent, ...rest];
      setEvents(nextEvents);
      eventsRef.current = nextEvents;
      // Stay on the response event so the approval card flips, then play forward.
      const nextIndex = base.length + 1;
      setIndex(nextIndex);
      indexRef.current = nextIndex;
      setPlaying(true);
      playingRef.current = true;
      scheduleAdvance();
    },
    [clearTimer, scenario.afterHitlApprove, scenario.afterHitlDeny, scheduleAdvance],
  );

  return {
    scenarios: CHAT_LAB_SCENARIOS,
    scenario,
    launched,
    playing,
    speed,
    setSpeed,
    messages: snapshot.messages as readonly EveMessage[],
    status: snapshot.status as ChatStatus,
    index: snapshot.index,
    eventCount: events.length,
    currentEventType: snapshot.currentEventType,
    checkpoints: snapshot.checkpoints,
    waitingForHitl: snapshot.waitingForHitl,
    error: errorMessage ? new Error(errorMessage) : undefined,
    play,
    pause,
    seek,
    step,
    seekMilestone,
    reset,
    launch,
    selectScenario,
    respond,
  };
}

export type MockConversationController = ReturnType<typeof useMockConversation>;
