import { EveAgentStore } from "eve/client";
import { isReactMaxUpdateDepthError } from "./react-max-update-depth.ts";

/**
 * Eve's `EveAgentStore.send` applies every stream event synchronously and
 * notifies React via `useSyncExternalStore` (`#O()` in eve 0.38). A long
 * `message.appended` burst — real dumps sit around 12ms/token — then trips
 * React error #185 (max nested update depth of 50) and aborts the client
 * stream. The durable server turn still finishes, which is why a refresh
 * shows the rest of the reply.
 *
 * Same class of bug as AI SDK `useChat` + `throttle: 50`.
 */
export const EVE_STREAM_UI_THROTTLE_MS = 50;

export type EveStoreStatus = "error" | "ready" | "streaming" | "submitted";

export type StreamingStoreScheduler = {
  now: () => number;
  schedule: (fn: () => void, delayMs: number) => () => void;
};

const defaultScheduler: StreamingStoreScheduler = {
  now: () => Date.now(),
  schedule: (fn, delayMs) => {
    const id = setTimeout(fn, delayMs);
    return () => clearTimeout(id);
  },
};

export type StreamingStoreNotifier = {
  notify: () => void;
  dispose: () => void;
};

/**
 * Coalesce store notifications while status is `streaming` (leading + trailing).
 * Lifecycle edges (`submitted` / `ready` / `error`) flush immediately so the
 * composer and error UI do not lag.
 *
 * React #185 thrown from the listener is swallowed so Eve keeps consuming the
 * durable stream instead of treating a UI loop as a turn failure.
 */
export function createStreamingStoreNotifier(input: {
  getStatus: () => EveStoreStatus | string;
  listener: () => void;
  waitMs?: number;
  scheduler?: StreamingStoreScheduler;
}): StreamingStoreNotifier {
  const waitMs = input.waitMs ?? EVE_STREAM_UI_THROTTLE_MS;
  const scheduler = input.scheduler ?? defaultScheduler;
  let cancelTimer: (() => void) | null = null;
  let pendingTrailing = false;
  let lastNotifyAt = Number.NEGATIVE_INFINITY;

  const clearTimer = () => {
    cancelTimer?.();
    cancelTimer = null;
  };

  const notify = (countTowardWindow: boolean) => {
    lastNotifyAt = countTowardWindow
      ? scheduler.now()
      : Number.NEGATIVE_INFINITY;
    pendingTrailing = false;
    try {
      input.listener();
    } catch (error) {
      if (!isReactMaxUpdateDepthError(error)) throw error;
      console.error(
        "[eve-store] React max update depth during stream; dropped this UI tick",
        error,
      );
    }
  };

  const notifyTrailing = () => {
    cancelTimer = null;
    if (pendingTrailing) notify(true);
  };

  return {
    notify: () => {
      const status = input.getStatus();
      if (status !== "streaming") {
        clearTimer();
        pendingTrailing = false;
        notify(false);
        return;
      }

      const elapsed = scheduler.now() - lastNotifyAt;
      if (elapsed >= waitMs) {
        clearTimer();
        notify(true);
        return;
      }

      pendingTrailing = true;
      if (cancelTimer === null) {
        cancelTimer = scheduler.schedule(notifyTrailing, waitMs - elapsed);
      }
    },
    dispose: () => {
      clearTimer();
      pendingTrailing = false;
    },
  };
}

let installed = false;

/** Patch Eve's store once so `useEveAgent` coalesces streaming UI ticks. */
export function installEveStoreSubscribeThrottle(): void {
  if (installed) return;
  installed = true;

  const original = EveAgentStore.prototype.subscribe;
  EveAgentStore.prototype.subscribe = function (
    this: EveAgentStore<unknown>,
    listener: () => void,
  ) {
    const notifier = createStreamingStoreNotifier({
      getStatus: () => this.snapshot.status,
      listener,
    });
    const unsubscribe = original.call(this, notifier.notify);
    return () => {
      notifier.dispose();
      unsubscribe();
    };
  };
}
