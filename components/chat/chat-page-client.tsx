"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { EveMessage } from "eve/react";
import type { AgentPrefs } from "#shared/agent-modes";
import { DEFAULT_AGENT_PREFS, normalizeAgentPrefs } from "#shared/agent-modes";
import {
  createOptimisticUserMessage,
  hasUserMessageText,
  mergeOptimisticUserMessage,
} from "#shared/optimistic-user-message";
import type { ThreadRecord, ThreadViewerAccess } from "#shared/types/thread";
import { DetailPanelHost } from "~/components/detail-panel/detail-panel-host";
import { Composer } from "~/components/ui/composer";
import { ContextPressureStrip } from "~/components/chat/context-pressure-strip";
import { ContextUsagePanel } from "~/components/chat/context-usage-panel";
import { UsageLimitStrip } from "~/components/usage/usage-limit-strip";
import { useChatSession } from "~/hooks/chat/use-chat-session";
import { peekPendingMessage } from "~/hooks/chat/use-pending-message";
import { saveThreadAgentPrefs } from "~/hooks/chat/use-thread-state";
import { useUsageMeter } from "~/hooks/use-usage-meter";
import { queryKeys } from "~/lib/query-keys";
import { estimateThreadContextBreakdown } from "~/lib/thread-context-breakdown";
import { resolveThreadContextPressure } from "~/lib/thread-context-pressure";
import { ChatErrorBanner } from "./chat-error-banner";
import { ChatThreadView } from "./chat-thread-view";

function contextTipStorageKey(threadId: string) {
  return `agent-c:context-tip-dismissed:${threadId}`;
}

function readContextTipDismissed(threadId: string) {
  try {
    return sessionStorage.getItem(contextTipStorageKey(threadId)) === "1";
  } catch {
    return false;
  }
}

function ComposerContextTip({
  chatId,
  show,
}: {
  chatId: string;
  show: boolean;
}) {
  const [dismissed, setDismissed] = useState(() => readContextTipDismissed(chatId));

  if (!show || dismissed) {
    return null;
  }

  return (
    <ContextPressureStrip
      onDismiss={() => {
        setDismissed(true);
        try {
          sessionStorage.setItem(contextTipStorageKey(chatId), "1");
        } catch {
          // ignore
        }
      }}
    />
  );
}

export function ChatPageClient({
  chatId,
  initialThread,
  access = "owner",
}: {
  chatId: string;
  initialThread: ThreadRecord;
  access?: ThreadViewerAccess;
}) {
  const [thread, setThread] = useState(initialThread);
  const [resumeEpoch, setResumeEpoch] = useState(0);
  const [agentPrefs, setAgentPrefs] = useState<AgentPrefs>(() =>
    normalizeAgentPrefs(initialThread.state?.agentPrefs ?? DEFAULT_AGENT_PREFS),
  );

  return (
    <ChatPageSession
      key={`${chatId}:${resumeEpoch}`}
      access={access}
      agentPrefs={agentPrefs}
      chatId={chatId}
      initialThread={thread}
      onAgentPrefsChange={setAgentPrefs}
      onLiveResumeSettled={(next) => {
        setThread(next);
        setResumeEpoch((value) => value + 1);
      }}
    />
  );
}

function ChatPageSession({
  chatId,
  initialThread,
  access = "owner",
  agentPrefs,
  onAgentPrefsChange,
  onLiveResumeSettled,
}: {
  chatId: string;
  initialThread: ThreadRecord;
  access?: ThreadViewerAccess;
  agentPrefs: AgentPrefs;
  onAgentPrefsChange: (prefs: AgentPrefs) => void;
  onLiveResumeSettled?: (thread: ThreadRecord) => void;
}) {
  const readOnly = access === "admin_readonly";
  const [seedText] = useState(() => peekPendingMessage(chatId));
  const [localUser, setLocalUser] = useState<EveMessage | null>(null);
  const { agent, error, isBusy } = useChatSession(chatId, initialThread, {
    readOnly,
    agentPrefs,
    onLiveResumeSettled,
  });
  const queryClient = useQueryClient();
  const usageMeter = useUsageMeter();
  const meter = usageMeter.data?.meter;
  const meterStatus = meter?.status ?? "ok";

  const handleAgentPrefsChange = useCallback(
    (next: AgentPrefs) => {
      const prefs = normalizeAgentPrefs(next);
      onAgentPrefsChange(prefs);
      if (readOnly) {
        return;
      }
      void saveThreadAgentPrefs(chatId, prefs, queryClient).catch((error) => {
        console.error("[persist-agent-prefs] failed", { chatId, error });
      });
    },
    [chatId, onAgentPrefsChange, queryClient, readOnly],
  );

  useEffect(() => {
    if (readOnly || isBusy) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.usageMeter });
  }, [isBusy, queryClient, readOnly]);

  const contextPressure = useMemo(
    () => resolveThreadContextPressure(agent.events),
    [agent.events],
  );
  const contextBreakdown = useMemo(
    () =>
      estimateThreadContextBreakdown({
        events: agent.events,
        messages: agent.data.messages,
        inputTokens: contextPressure.inputTokens,
        contextWindowTokens: contextPressure.contextWindowTokens,
      }),
    [
      agent.data.messages,
      agent.events,
      contextPressure.inputTokens,
      contextPressure.contextWindowTokens,
    ],
  );

  const showUsageStrip = !readOnly && (meterStatus === "warn" || meterStatus === "blocked");
  const usageBlocked = meterStatus === "blocked";

  const seedMessage =
    seedText && !hasUserMessageText(agent.data.messages, seedText)
      ? createOptimisticUserMessage(seedText, `pending-user-${chatId}`)
      : null;
  const messages = mergeOptimisticUserMessage(
    mergeOptimisticUserMessage(agent.data.messages, seedMessage as EveMessage | null),
    localUser,
  );

  useEffect(() => {
    if (!localUser) return;
    const merged = mergeOptimisticUserMessage(agent.data.messages, localUser);
    if (merged.length === agent.data.messages.length) {
      setLocalUser(null);
    }
  }, [agent.data.messages, localUser]);

  const displayStatus =
    (seedMessage || localUser) &&
    agent.status !== "submitted" &&
    agent.status !== "streaming"
      ? "submitted"
      : agent.status;

  function respondToInput(requestId: string, optionId: string) {
    if (readOnly || usageBlocked) return;
    void agent.respond([{ requestId, optionId }]);
  }

  return (
    <DetailPanelHost>
      <ChatThreadView
        composer={
          readOnly ? (
            <p className="rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
              Admin view — read only. You can&apos;t send messages in another user&apos;s thread.
            </p>
          ) : (
            <Composer
              agentPrefs={agentPrefs}
              disabled={usageBlocked}
              onAgentPrefsChange={handleAgentPrefsChange}
              onStop={() => {
                void agent.cancel();
              }}
              onSubmit={(message) => {
                if (usageBlocked) return;
                const text = message.trim();
                if (!text) return;
                setLocalUser(createOptimisticUserMessage(text) as EveMessage);
                void agent.send(text);
              }}
              status={displayStatus}
            />
          )
        }
        footerBeforeComposer={
          <>
            <ChatErrorBanner error={error} threadId={chatId} />
            {readOnly ? null : (
              <>
                {showUsageStrip ? <UsageLimitStrip status={meterStatus} /> : null}
                <ComposerContextTip
                  key={chatId}
                  chatId={chatId}
                  show={contextPressure.showTip}
                />
              </>
            )}
          </>
        }
        footerOverlayEnd={
          readOnly || !contextBreakdown || contextBreakdown.ratio < 0.15
            ? null
            : (
              <ContextUsagePanel
                breakdown={contextBreakdown}
                modelId={contextPressure.modelId}
                usageFromCompaction={contextPressure.usageFromCompaction}
              />
            )
        }
        messages={messages}
        onRespond={respondToInput}
        status={displayStatus}
        streamEvents={agent.events}
        threadId={chatId}
      />
    </DetailPanelHost>
  );
}
