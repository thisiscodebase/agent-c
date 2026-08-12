import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractComposerPasteRef } from "./composer-paste-refs.ts";
import { formatRefMarker, parseRefMarkers } from "./composer-refs.ts";
import { parseTallyUrl } from "./tally-url.ts";

describe("parseTallyUrl", () => {
  it("parses public share and admin form URLs", () => {
    assert.deepEqual(parseTallyUrl("https://tally.so/r/wzO0P0?utm=1"), {
      formId: "wzO0P0",
      url: "https://tally.so/r/wzO0P0",
    });
    assert.equal(
      parseTallyUrl("https://tally.so/forms/ZjyKAV/edit")?.formId,
      "ZjyKAV",
    );
  });

  it("rejects non-form tally paths", () => {
    assert.equal(parseTallyUrl("https://tally.so/help/mcp"), null);
  });
});

describe("tally ref markers + paste", () => {
  it("serializes tally composer markers", () => {
    const marker = formatRefMarker("tally", "ZjyKAV", "Post-course Survey");
    assert.equal(marker, "[[ref:tally:ZjyKAV|Post-course Survey]]");
    assert.equal(parseRefMarkers(marker)[0]?.service, "tally");
  });

  it("extracts Tally paste refs", () => {
    const parsed = extractComposerPasteRef({
      plain: "https://tally.so/r/wzO0P0",
    });
    assert.equal(parsed?.service, "tally");
    assert.equal(parsed?.item.id, "wzO0P0");
  });
});
