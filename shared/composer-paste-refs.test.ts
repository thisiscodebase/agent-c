import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractComposerPasteRef,
  shouldChipComposerPaste,
} from "./composer-paste-refs.ts";
import { parseDriveUrl } from "./drive-url.ts";
import { parseNotionUrl } from "./notion-url.ts";

describe("parseDriveUrl", () => {
  it("parses Docs / Drive file URLs", () => {
    assert.equal(
      parseDriveUrl(
        "https://docs.google.com/document/d/1abcDEF-ghij_klmn/edit",
      )?.fileId,
      "1abcDEF-ghij_klmn",
    );
    assert.equal(
      parseDriveUrl(
        "https://drive.google.com/file/d/1abcDEF-ghij_klmn/view?usp=sharing",
      )?.fileId,
      "1abcDEF-ghij_klmn",
    );
    assert.equal(
      parseDriveUrl(
        "https://drive.google.com/drive/u/0/folders/0AIbanUNL17gpUk9PVA",
      )?.fileId,
      "0AIbanUNL17gpUk9PVA",
    );
    assert.equal(
      parseDriveUrl("https://drive.google.com/open?id=1abcDEF-ghij_klmn")
        ?.fileId,
      "1abcDEF-ghij_klmn",
    );
  });
});

describe("parseNotionUrl", () => {
  it("parses titled and bare Notion page URLs", () => {
    const titled = parseNotionUrl(
      "https://www.notion.so/My-Cool-Page-2f8e4c1a0b3d4e5f8a9b0c1d2e3f4a5b",
    );
    assert.equal(titled?.compactId, "2f8e4c1a0b3d4e5f8a9b0c1d2e3f4a5b");
    assert.equal(titled?.titleHint, "My Cool Page");

    const bare = parseNotionUrl(
      "https://notion.so/2f8e4c1a0b3d4e5f8a9b0c1d2e3f4a5b",
    );
    assert.equal(bare?.compactId, "2f8e4c1a0b3d4e5f8a9b0c1d2e3f4a5b");
  });
});

describe("extractComposerPasteRef", () => {
  it("routes HubSpot / Drive / Notion pastes", () => {
    const hubspot = extractComposerPasteRef({
      plain:
        "https://app-eu1.hubspot.com/contacts/1/record/0-1/843100868821",
    });
    assert.equal(hubspot?.service, "hubspot");
    assert.equal(hubspot?.item.id, "contact:843100868821");

    const drive = extractComposerPasteRef({
      plain: "https://docs.google.com/document/d/1abcDEF-ghij_klmn/edit",
    });
    assert.equal(drive?.service, "drive");
    assert.equal(drive?.item.id, "1abcDEF-ghij_klmn");

    const notion = extractComposerPasteRef({
      plain:
        "https://www.notion.so/Hello-World-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    assert.equal(notion?.service, "notion");
    assert.equal(notion?.item.name, "Hello World");
  });

  it("chips sole URLs and short copy-link HTML", () => {
    const parsed = extractComposerPasteRef({
      plain: "https://docs.google.com/document/d/1abcDEF-ghij_klmn/edit",
    });
    assert.equal(
      shouldChipComposerPaste({
        plain: "https://docs.google.com/document/d/1abcDEF-ghij_klmn/edit",
        parsed,
      }),
      true,
    );
  });
});
