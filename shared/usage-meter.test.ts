import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_USER_USAGE_LIMIT_USD,
  effectiveUsageLimitUsd,
  isAppUserId,
  usageMeterPercent,
  usageMeterStatus,
  usagePeriodKey,
  usagePeriodResetsAt,
} from "./usage-meter.ts";

describe("isAppUserId", () => {
  it("accepts Better Auth user ids", () => {
    assert.equal(isAppUserId("EAM52HleF6JQPCgQYNH11474awGYdy97"), true);
  });

  it("rejects Eve and unlinked Slack principals", () => {
    assert.equal(isAppUserId("eve:abc"), false);
    assert.equal(isAppUserId("slack:T123:U456"), false);
    assert.equal(isAppUserId("slack:U456"), false);
    assert.equal(isAppUserId(null), false);
    assert.equal(isAppUserId(""), false);
  });
});

describe("usage period helpers", () => {
  it("formats UTC month keys and reset instants", () => {
    assert.equal(usagePeriodKey(new Date("2026-08-17T12:00:00Z")), "2026-08");
    assert.equal(usagePeriodResetsAt("2026-08"), Date.UTC(2026, 8, 1));
    assert.equal(usagePeriodResetsAt("2026-12"), Date.UTC(2027, 0, 1));
  });
});

describe("usage meter limits", () => {
  it("prefers overrides and falls back to company / default", () => {
    assert.equal(effectiveUsageLimitUsd(25), 25);
    assert.equal(effectiveUsageLimitUsd(null, 15), 15);
    assert.equal(effectiveUsageLimitUsd(0, 0), DEFAULT_USER_USAGE_LIMIT_USD);
  });

  it("computes status and percent with warn threshold at 80%", () => {
    assert.equal(usageMeterStatus(0, 10), "ok");
    assert.equal(usageMeterStatus(7.9, 10), "ok");
    assert.equal(usageMeterStatus(8, 10), "warn");
    assert.equal(usageMeterStatus(10, 10), "blocked");
    assert.equal(usageMeterStatus(1, 0), "blocked");
    assert.equal(usageMeterPercent(0.4, 10), 4);
    assert.equal(usageMeterPercent(50, 10), 100);
    assert.equal(usageMeterPercent(1, 0), 100);
  });
});
