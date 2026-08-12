import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatAsanaRefId,
  parseAsanaRefId,
  parseAsanaUrl,
} from "./asana-url.ts";
import { extractComposerPasteRef } from "./composer-paste-refs.ts";
import { formatRefMarker, parseRefMarkers } from "./composer-refs.ts";

describe("parseAsanaUrl", () => {
  it("parses V0 and V1 task URLs", () => {
    assert.deepEqual(
      parseAsanaUrl("https://app.asana.com/0/0/1216893547581448/f"),
      {
        kind: "task",
        objectId: "1216893547581448",
        projectId: undefined,
        url: "https://app.asana.com/0/0/1216893547581448",
      },
    );

    const v1 = parseAsanaUrl(
      "https://app.asana.com/1/23980952540227/project/1205150710542683/task/1217395603177505",
    );
    assert.equal(v1?.kind, "task");
    assert.equal(v1?.objectId, "1217395603177505");
    assert.equal(v1?.projectId, "1205150710542683");
  });

  it("parses project URLs", () => {
    const v1 = parseAsanaUrl(
      "https://app.asana.com/1/23980952540227/project/1205150710542683",
    );
    assert.equal(v1?.kind, "project");
    assert.equal(v1?.objectId, "1205150710542683");

    const v0 = parseAsanaUrl("https://app.asana.com/0/1205150710542683/1205150710542683");
    assert.equal(v0?.kind, "project");
  });
});

describe("asana ref markers", () => {
  it("round-trips task refs", () => {
    assert.equal(formatAsanaRefId("task", "123"), "task:123");
    assert.deepEqual(parseAsanaRefId("project:456"), {
      kind: "project",
      objectId: "456",
    });
    const marker = formatRefMarker("asana", "task:1216893547581448", "Reel");
    assert.equal(marker, "[[ref:asana:task:1216893547581448|Reel]]");
    assert.equal(parseRefMarkers(marker)[0]?.service, "asana");
  });

  it("extracts Asana paste refs", () => {
    const parsed = extractComposerPasteRef({
      plain: "https://app.asana.com/1/23980952540227/task/1216893547581448",
    });
    assert.equal(parsed?.service, "asana");
    assert.equal(parsed?.item.id, "task:1216893547581448");
  });
});
