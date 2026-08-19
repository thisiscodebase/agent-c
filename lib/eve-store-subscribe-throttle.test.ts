import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isReactMaxUpdateDepthError } from "./react-max-update-depth.ts";
import { createStreamingStoreNotifier } from "./eve-store-subscribe-throttle.ts";

function createTestClock() {
  let now = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  let nextId = 1;

  return {
    now: () => now,
    advance(ms: number) {
      now += ms;
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= now)
        .sort((a, b) => a[1].at - b[1].at);
      for (const [id, timer] of due) {
        timers.delete(id);
        timer.fn();
      }
    },
    scheduler: {
      now: () => now,
      schedule: (fn: () => void, delayMs: number) => {
        const id = nextId;
        nextId += 1;
        timers.set(id, { at: now + delayMs, fn });
        return () => {
          timers.delete(id);
        };
      },
    },
  };
}

describe("isReactMaxUpdateDepthError", () => {
  it("matches production and development messages", () => {
    assert.equal(
      isReactMaxUpdateDepthError(
        new Error(
          "Minified React error #185; visit https://react.dev/errors/185",
        ),
      ),
      true,
    );
    assert.equal(
      isReactMaxUpdateDepthError(
        new Error("Maximum update depth exceeded. This can happen when a component"),
      ),
      true,
    );
    assert.equal(isReactMaxUpdateDepthError(new Error("chat failed")), false);
    assert.equal(isReactMaxUpdateDepthError("185"), false);
  });
});

describe("createStreamingStoreNotifier", () => {
  it("notifies immediately when the store is not streaming", () => {
    const clock = createTestClock();
    let calls = 0;
    let status: string = "submitted";
    const notifier = createStreamingStoreNotifier({
      getStatus: () => status,
      listener: () => {
        calls += 1;
      },
      scheduler: clock.scheduler,
    });

    notifier.notify();
    notifier.notify();
    assert.equal(calls, 2);

    status = "ready";
    notifier.notify();
    assert.equal(calls, 3);
  });

  it("does not delay the first streaming tick after submitted", () => {
    const clock = createTestClock();
    let calls = 0;
    let status: string = "submitted";
    const notifier = createStreamingStoreNotifier({
      getStatus: () => status,
      listener: () => {
        calls += 1;
      },
      waitMs: 50,
      scheduler: clock.scheduler,
    });

    notifier.notify();
    status = "streaming";
    notifier.notify();
    assert.equal(calls, 2);
  });

  it("coalesces a synchronous streaming burst into a leading tick", () => {
    const clock = createTestClock();
    let calls = 0;
    const notifier = createStreamingStoreNotifier({
      getStatus: () => "streaming",
      listener: () => {
        calls += 1;
      },
      waitMs: 50,
      scheduler: clock.scheduler,
    });

    for (let i = 0; i < 60; i += 1) notifier.notify();
    assert.equal(calls, 1);

    clock.advance(50);
    assert.equal(calls, 2);
  });

  it("flushes immediately when streaming ends mid-window", () => {
    const clock = createTestClock();
    let calls = 0;
    let status: string = "streaming";
    const notifier = createStreamingStoreNotifier({
      getStatus: () => status,
      listener: () => {
        calls += 1;
      },
      waitMs: 50,
      scheduler: clock.scheduler,
    });

    notifier.notify();
    clock.advance(10);
    notifier.notify();
    assert.equal(calls, 1);

    status = "ready";
    notifier.notify();
    assert.equal(calls, 2);
  });

  it("swallows React #185 from the listener so the stream can continue", () => {
    const clock = createTestClock();
    let calls = 0;
    const notifier = createStreamingStoreNotifier({
      getStatus: () => "submitted",
      listener: () => {
        calls += 1;
        throw new Error("Minified React error #185; visit https://react.dev/errors/185");
      },
      scheduler: clock.scheduler,
    });

    notifier.notify();
    notifier.notify();
    assert.equal(calls, 2);
  });

  it("rethrows non-185 listener errors", () => {
    const clock = createTestClock();
    const notifier = createStreamingStoreNotifier({
      getStatus: () => "ready",
      listener: () => {
        throw new Error("disk full");
      },
      scheduler: clock.scheduler,
    });

    assert.throws(() => notifier.notify(), /disk full/);
  });
});
