"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { ThreadRecord, ThreadViewerAccess } from "#shared/types/thread";
import { DetailPanelHost } from "~/components/detail-panel/detail-panel-host";
import { Composer } from "~/components/ui/composer";
import {
  MessageScrollerButton,
  MessageScrollerProvider,
} from "~/components/ui/message-scroller";
import { ContextPressureStrip } from "~/components/chat/context-pressure-strip";
import { ContextUsagePanel } from "~/components/chat/context-usage-panel";
import { UsageLimitStrip } from "~/components/usage/usage-limit-strip";
import { useChatSession } from "~/hooks/chat/use-chat-session";
import { useUsageMeter } from "~/hooks/use-usage-meter";
import { queryKeys } from "~/lib/query-keys";
import { estimateThreadContextBreakdown } from "~/lib/thread-context-breakdown";
import { resolveThreadContextPressure } from "~/lib/thread-context-pressure";
import {
  resolveTurnOrbActivity,
  shouldShowAgentPresence,
} from "~/lib/orb-activity";
import { cn } from "~/lib/utils";
import {
  chatInputColumnClass,
  chatFloatingFooterClass,
  chatFooterFadeClass,
  chatFooterInputAreaClass,
  chatFooterInteractiveClass,
  chatFooterSolidClass,
} from "./chat-layout";
import { ChatErrorBanner } from "./chat-error-banner";
import { MessageList } from "./message-list";
import { AgentPresence } from "./agent-presence";

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
  const readOnly = access === "admin_readonly";
  const { agent, error, isBusy } = useChatSession(chatId, initialThread, { readOnly });
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const usageMeter = useUsageMeter();
  const meter = usageMeter.data?.meter;
  const meterStatus = meter?.status ?? "ok";

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

  const showPresence = !readOnly && shouldShowAgentPresence(
    agent.data.messages,
    agent.status,
  );
  const orbActivity = showPresence
    ? resolveTurnOrbActivity(agent.data.messages, agent.status)
    : null;

  function respondToInput(requestId: string, optionId: string) {
    if (readOnly || usageBlocked) return;
    void agent.send({ inputResponses: [{ requestId, optionId }] });
  }

  return (
    <MessageScrollerProvider autoScroll>
      <DetailPanelHost>
        <div className="relative h-full min-w-0">
          <MessageList
            messages={agent.data.messages}
            onRespond={respondToInput}
            status={agent.status}
            threadId={chatId}
          />

          <div className={chatFloatingFooterClass}>
            <div className="relative">
              <div aria-hidden className={chatFooterFadeClass} />

              <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center">
                <div className="relative flex items-center justify-center">
                  <AnimatePresence initial={false}>
                    {orbActivity ? (
                      <motion.div
                        key="agent-presence"
                        initial={
                          reduceMotion ? false : { opacity: 0, y: 8, scale: 0.96 }
                        }
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={
                          reduceMotion
                            ? undefined
                            : { opacity: 0, y: 6, scale: 0.96 }
                        }
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <AgentPresence
                          label={orbActivity.label}
                          paused={orbActivity.state === "listening"}
                          state={orbActivity.state}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <MessageScrollerButton
                    className={cn(
                      "pointer-events-auto z-10",
                      orbActivity
                        ? [
                            "!absolute !inset-auto !left-full !top-1/2 !ml-2",
                            "!-translate-y-1/2 !translate-x-0",
                            "data-[direction=end]:!bottom-auto",
                            "data-[direction=end]:data-[active=false]:!translate-y-[-40%] data-[direction=end]:data-[active=false]:!translate-x-1",
                          ]
                        : [
                            "!static !inset-auto !translate-x-0",
                            "data-[direction=end]:!bottom-auto",
                            "data-[direction=end]:data-[active=false]:!translate-y-2",
                          ],
                    )}
                  />
                </div>
              </div>
            </div>

            <div className={chatFooterInputAreaClass}>
              <div aria-hidden className={chatFooterSolidClass} />
              <div className={chatFooterInteractiveClass}>
                <ChatErrorBanner error={error} threadId={chatId} />

                <div className={`${chatInputColumnClass} relative flex flex-col gap-2`}>
                  {readOnly ? (
                    <p className="rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
                      Admin view — read only. You can&apos;t send messages in another user&apos;s thread.
                    </p>
                  ) : null}
                  {contextBreakdown && contextBreakdown.ratio >= 0.15 ? (
                    <div className="flex justify-end">
                      <ContextUsagePanel
                        breakdown={contextBreakdown}
                        modelId={contextPressure.modelId}
                        usageFromCompaction={contextPressure.usageFromCompaction}
                      />
                    </div>
                  ) : null}
                  {showUsageStrip ? (
                    <UsageLimitStrip status={meterStatus} />
                  ) : null}
                  <ComposerContextTip
                    key={chatId}
                    chatId={chatId}
                    show={!readOnly && contextPressure.showTip}
                  />
                  {readOnly ? null : (
                    <Composer
                      disabled={usageBlocked}
                      onStop={agent.stop}
                      onSubmit={(message) => {
                        if (usageBlocked) return;
                        if (message.trim()) void agent.send({ message });
                      }}
                      status={agent.status}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DetailPanelHost>
    </MessageScrollerProvider>
  );
}
