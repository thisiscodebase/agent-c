"use client";

import { useEffect } from "react";
import type { MockConversationController } from "./use-mock-conversation";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }

  return Boolean(target.closest("[contenteditable='true'], input, textarea, select"));
}

/**
 * Space plays/pauses. Arrows step one event; Shift+Arrows jump checkpoints.
 * Ignored while the composer or any other field is focused.
 */
export function useMockLabHotkeys(controller: MockConversationController) {
  const { launched, playing, play, pause, launch, step, seekMilestone } = controller;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.code === "Space" && !event.shiftKey) {
        if (event.repeat) return;
        event.preventDefault();
        if (!launched) {
          launch();
          return;
        }
        if (playing) {
          pause();
          return;
        }
        play();
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      if (event.shiftKey) {
        seekMilestone(direction);
        return;
      }
      step(direction);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [launch, launched, pause, play, playing, seekMilestone, step]);
}
