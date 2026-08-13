import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAppUserId } from "./usage-meter.ts";

describe("isAppUserId", () => {
  it("accepts Better Auth user ids", () => {
    assert.equal(isAppUserId("user_abc123"), true);
    assert.equal(isAppUserId("a1b2c3d4-e5f6-7890-abcd-ef1234567890"), true);
  });

  it("rejects Eve and unlinked Slack principals", () => {
    assert.equal(isAppUserId("eve:anonymous"), false);
    assert.equal(isAppUserId("slack:T123:U456"), false);
    assert.equal(isAppUserId("slack:U456"), false);
    assert.equal(isAppUserId(null), false);
    assert.equal(isAppUserId(""), false);
  });
});
