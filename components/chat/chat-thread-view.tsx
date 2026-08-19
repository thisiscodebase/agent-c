"use client";

import type { ChatStatus } from "ai";
import type { EveAgentReducerEvent, EveMessage } from "eve/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import type { AgentPrefs } from "#shared/agent-modes";
import { Composer } from "~/components/ui/composer";
import {
  MessageScrollerButton,
  MessageScrollerProvider,
} from "~/components/ui/message-scroller";
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
import { AgentPresence } from "./agent-presence";
import { LiveSubagentActivityProvider } from "./live-subagent-activity";
import { MessageList } from "./message-list";

export function ChatThreadView({
  messages,
  status,
  streamEvents,
  threadId,
  onRespond,
  animateInitialUser = false,
  agentPrefs,
  onAgentPrefsChange,
  onSubmit,
  onStop,
  composerDisabled,
  composer,
  footerBeforeComposer,
  footerOverlayEnd,
  footerAfterComposer,
  footerSpacerClass,
}: {
  messages: readonly EveMessage[];
  status?: ChatStatus;
  /** Applied stream prefix — used to morph live subagent orbs from nested child events. */
  streamEvents?: readonly EveAgentReducerEvent[];
  threadId?: string;
  onRespond?: (requestId: string, optionId: string) => void;
  animateInitialUser?: boolean;
  agentPrefs?: AgentPrefs;
  onAgentPrefsChange?: (prefs: AgentPrefs) => void;
  onSubmit?: (message: string) => void;
  onStop?: () => void;
  composerDisabled?: boolean;
  /** When set, replaces the default composer. */
  composer?: ReactNode;
  footerBeforeComposer?: ReactNode;
  /** Sits on the presence / jump-to-bottom row, trailing edge of the composer column. */
  footerOverlayEnd?: ReactNode;
  /** Secondary panel stacked under the composer (chat lab HUD). */
  footerAfterComposer?: ReactNode;
  footerSpacerClass?: string;
}) {
  const reduceMotion = useReducedMotion();
  const showPresence = shouldShowAgentPresence(messages, status);
  const orbActivity = showPresence
    ? resolveTurnOrbActivity(messages, status)
    : null;

  return (
    <LiveSubagentActivityProvider events={streamEvents}>
      <MessageScrollerProvider autoScroll>
        <div className="relative h-full min-w-0">
          <MessageList
            animateInitialUser={animateInitialUser}
            footerSpacerClass={footerSpacerClass}
            messages={messages}
            onRespond={onRespond ?? noopRespond}
            status={status}
            threadId={threadId}
          />

        <div className={chatFloatingFooterClass}>
          <div className="relative">
            <div aria-hidden className={chatFooterFadeClass} />

            <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10">
              <div
                className={cn(
                  chatInputColumnClass,
                  "grid min-h-10 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center",
                )}
              >
                <div />
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
                            "!absolute !inset-auto !left-full !ml-2 !top-1/2",
                            "!-translate-y-1/2 !translate-x-0",
                            "data-[direction=end]:!bottom-auto",
                            "data-[direction=end]:data-[active=false]:!translate-x-1 data-[direction=end]:data-[active=false]:!translate-y-[-40%]",
                          ]
                        : [
                            "!static !inset-auto !translate-x-0",
                            "data-[direction=end]:!bottom-auto",
                            "data-[direction=end]:data-[active=false]:!translate-y-2",
                          ],
                    )}
                  />
                </div>
                <div
                  className={cn(
                    "flex items-center justify-end",
                    footerOverlayEnd ? "pointer-events-auto" : "pointer-events-none",
                  )}
                >
                  {footerOverlayEnd}
                </div>
              </div>
            </div>
          </div>

          <div className={chatFooterInputAreaClass}>
            <div aria-hidden className={chatFooterSolidClass} />
            <div className={chatFooterInteractiveClass}>
              <div className={`${chatInputColumnClass} relative flex flex-col gap-2`}>
                {footerBeforeComposer}
                {composer ?? (
                  <Composer
                    agentPrefs={agentPrefs}
                    disabled={composerDisabled}
                    onAgentPrefsChange={onAgentPrefsChange}
                    onStop={onStop}
                    onSubmit={(message) => {
                      if (composerDisabled) return;
                      if (message.trim()) onSubmit?.(message);
                    }}
                    status={status}
                  />
                )}
                {footerAfterComposer}
              </div>
            </div>
          </div>
        </div>
        </div>
      </MessageScrollerProvider>
    </LiveSubagentActivityProvider>
  );
}

function noopRespond(_requestId: string, _optionId: string) {}
