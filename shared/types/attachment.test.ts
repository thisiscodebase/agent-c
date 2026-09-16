import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendAttachmentMarkers,
  extractAttachmentMarkers,
  formatAttachmentMarker,
  resolveAttachmentMime,
  unescapeAttachmentMarkerName,
} from "./attachment.ts";

describe("attachment markers", () => {
  it("round-trips special characters in filenames", () => {
    const marker = formatAttachmentMarker("abc", "q1 | report].csv");
    assert.equal(marker, "[[attachment:abc|q1 \\| report\\].csv]]");
    const name = marker.match(/\|((?:\\.|[^\]\\])*)\]\]/)?.[1] ?? "";
    assert.equal(unescapeAttachmentMarkerName(name), "q1 | report].csv");
  });

  it("appends markers under the user text", () => {
    const text = appendAttachmentMarkers("Summarise this", [
      { id: "1", name: "a.csv" },
      { id: "2", name: "b.pdf" },
    ]);
    assert.match(text, /^Summarise this\n\n\[\[attachment:1\|a\.csv\]\]/);
    assert.match(text, /\[\[attachment:2\|b\.pdf\]\]$/);
  });

  it("resolves csv mime from extension when browser omits type", () => {
    assert.equal(resolveAttachmentMime("", "roster.csv"), "text/csv");
    assert.equal(resolveAttachmentMime("text/csv", "roster.csv"), "text/csv");
  });

  it("extracts attachment markers from prompt text", () => {
    const packed = appendAttachmentMarkers("Summarise this", [
      { id: "1", name: "a.csv" },
      { id: "2", name: "q1 | report].pdf" },
    ]);
    const extracted = extractAttachmentMarkers(packed);
    assert.equal(extracted.text, "Summarise this");
    assert.deepEqual(extracted.attachments, [
      { id: "1", name: "a.csv" },
      { id: "2", name: "q1 | report].pdf" },
    ]);
  });
});
