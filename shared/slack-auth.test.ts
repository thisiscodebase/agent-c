import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONNECT_USER_ISSUER } from "./connect.ts";
import { buildAppSessionAuth } from "./slack-auth.ts";

describe("buildAppSessionAuth", () => {
  it("drops empty attributes and stamps the Connect issuer", () => {
    const auth = buildAppSessionAuth("user_123", {
      email: "a@example.com",
      name: "Ada",
      slack_user_id: undefined,
      linked: "true",
    });
    assert.deepEqual(auth, {
      attributes: {
        email: "a@example.com",
        name: "Ada",
        linked: "true",
      },
      authenticator: CONNECT_USER_ISSUER,
      issuer: CONNECT_USER_ISSUER,
      principalId: "user_123",
      principalType: "user",
    });
  });
});
