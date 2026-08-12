"use client";

import type { ChatStatus } from "ai";
import type { EveMessage } from "eve/react";
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
import { MessageList } from "./message-list";

export function ChatThreadView({
  messages,
  status,
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
}: {
  messages: readonly EveMessage[];
  status?: ChatStatus;
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
}) {
  const reduceMotion = useReducedMotion();
  const showPresence = shouldShowAgentPresence(messages, status);
  const orbActivity = showPresence
    ? resolveTurnOrbActivity(messages, status)
    : null;

  return (
    <MessageScrollerProvider autoScroll>
      <div className="relative h-full min-w-0">
        <MessageList
          animateInitialUser={animateInitialUser}
          messages={messages}
          onRespond={onRespond ?? noopRespond}
          status={status}
          threadId={threadId}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </MessageScrollerProvider>
  );
}

function noopRespond(_requestId: string, _optionId: string) {}
