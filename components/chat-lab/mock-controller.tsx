"use client";

import {
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "lucide-react";
import type { MockConversationController } from "~/hooks/chat/use-mock-conversation";
import type { ChatLabSpeed } from "~/lib/chat-lab";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const SPEEDS: ChatLabSpeed[] = [0.25, 0.5, 1, 2, 4];

const COMPOSER_CARD_CLASS =
  "rounded-3xl border border-black/5 bg-white dark:border-white/10 dark:bg-card "
  + "shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.08)]";

export function MockController({
  controller,
  className,
}: {
  controller: MockConversationController;
  className?: string;
}) {
  const {
    scenarios,
    scenario,
    playing,
    speed,
    setSpeed,
    index,
    eventCount,
    currentEventType,
    status,
    checkpoints,
    waitingForHitl,
    play,
    pause,
    seek,
    step,
    reset,
    selectScenario,
    messages,
  } = controller;

  const progress = eventCount === 0 ? 0 : index / eventCount;
  const partCount = messages.reduce((sum, message) => sum + message.parts.length, 0);

  return (
    <div className={cn("pointer-events-auto w-full", COMPOSER_CARD_CLASS, "px-3 py-2", className)}>
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-800 dark:text-orange-100">
          Mock
        </span>
        <select
          aria-label="Scenario"
          className="h-7 min-w-0 max-w-40 truncate rounded-full border border-black/5 bg-transparent px-2 text-xs dark:border-white/10"
          value={scenario.id}
          onChange={(event) => selectScenario(event.target.value)}
        >
          {scenarios.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
        <p className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground">
          <span className="text-foreground">{status}</span>
          <span className="mx-1.5 text-border">·</span>
          <span>{currentEventType ?? "idle"}</span>
          <span className="mx-1.5 text-border">·</span>
          <span>{partCount} parts</span>
          {waitingForHitl ? (
            <span className="ml-1.5 font-semibold text-orange-700 dark:text-orange-300">
              HITL
            </span>
          ) : null}
        </p>
        <select
          aria-label="Playback speed"
          className="h-7 shrink-0 rounded-full border border-black/5 bg-transparent px-2 text-xs dark:border-white/10"
          value={String(speed)}
          onChange={(event) => setSpeed(Number(event.target.value) as ChatLabSpeed)}
        >
          {SPEEDS.map((value) => (
            <option key={value} value={value}>
              {value}x
            </option>
          ))}
        </select>
      </div>

      <div className="mt-1.5 flex items-center gap-0.5">
        <Button
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={() => step(-1)}
        >
          <SkipBackIcon />
        </Button>
        {playing ? (
          <Button size="icon-sm" type="button" variant="ghost" onClick={pause}>
            <PauseIcon />
          </Button>
        ) : (
          <Button
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={() => {
              if (!controller.launched) {
                controller.launch();
              }
              else {
                play();
              }
            }}
          >
            <PlayIcon />
          </Button>
        )}
        <Button size="icon-sm" type="button" variant="ghost" onClick={() => step(1)}>
          <SkipForwardIcon />
        </Button>
        <Button size="icon-sm" type="button" variant="ghost" onClick={reset}>
          <RotateCcwIcon />
        </Button>

        <div className="relative mx-1.5 h-2 min-w-0 flex-1">
          <input
            aria-label="Scrub events"
            className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none bg-transparent"
            max={eventCount}
            min={0}
            step={1}
            type="range"
            value={index}
            onChange={(event) => seek(Number(event.target.value))}
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 my-auto h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-orange-500/80"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          {checkpoints.map((checkpoint) => (
            <button
              key={`${checkpoint.kind}-${checkpoint.index}`}
              aria-label={`Jump to ${checkpoint.label}`}
              className="pointer-events-auto absolute top-1/2 z-20 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-foreground/50 dark:border-card"
              style={{
                left: `${eventCount === 0 ? 0 : (checkpoint.index / eventCount) * 100}%`,
              }}
              title={checkpoint.label}
              type="button"
              onClick={() => seek(checkpoint.index)}
            />
          ))}
        </div>

        <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
          {index}/{eventCount}
        </span>
      </div>
    </div>
  );
}
