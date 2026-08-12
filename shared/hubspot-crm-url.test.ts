import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatRefMarker,
  parseRefMarkers,
  toDisplayText,
} from "./composer-refs.ts";
import {
  extractHubspotCrmUrl,
  formatHubspotRefId,
  isSoleHubspotCrmUrl,
  parseHubspotCrmUrl,
  parseHubspotRefId,
} from "./hubspot-crm-url.ts";

describe("parseHubspotCrmUrl", () => {
  it("parses modern contact record URLs", () => {
    const parsed = parseHubspotCrmUrl(
      "https://app.hubspot.com/contacts/143961767/record/0-1/843732000997?utm_source=x",
    );
    assert.deepEqual(parsed, {
      kind: "contact",
      objectId: "843732000997",
      portalId: "143961767",
      url: "https://app.hubspot.com/contacts/143961767/record/0-1/843732000997",
    });
  });

  it("parses modern company record URLs", () => {
    const parsed = parseHubspotCrmUrl(
      "https://app.hubspot.com/contacts/1/record/0-2/442902968511",
    );
    assert.equal(parsed?.kind, "company");
    assert.equal(parsed?.objectId, "442902968511");
  });

  it("parses legacy contact/company paths", () => {
    assert.equal(
      parseHubspotCrmUrl(
        "https://app.hubspot.com/contacts/99/contact/123",
      )?.kind,
      "contact",
    );
    assert.equal(
      parseHubspotCrmUrl(
        "https://app.hubspot.com/contacts/99/company/456",
      )?.kind,
      "company",
    );
  });

  it("parses regional EU app hosts from live HubSpot copy links", () => {
    const parsed = parseHubspotCrmUrl(
      "https://app-eu1.hubspot.com/contacts/143961767/record/0-1/843100868821?eschref=%2Fcontacts%2F143961767%2Fobjects%2F0-1%2Fviews%2Fall%2Flist",
    );
    assert.deepEqual(parsed, {
      kind: "contact",
      objectId: "843100868821",
      portalId: "143961767",
      url: "https://app-eu1.hubspot.com/contacts/143961767/record/0-1/843100868821",
    });
  });

  it("extracts HubSpot URLs from HTML copy-link payloads", () => {
    const parsed = extractHubspotCrmUrl({
      plain: "Diarmuid McDonnell",
      html: '<a href="https://app-eu1.hubspot.com/contacts/143961767/record/0-1/843100868821">Diarmuid McDonnell</a>',
    });
    assert.equal(parsed?.objectId, "843100868821");
    assert.equal(parsed?.kind, "contact");
  });
});

describe("hubspot ref ids + markers", () => {
  it("round-trips contact/company ref ids", () => {
    assert.equal(formatHubspotRefId("contact", "123"), "contact:123");
    assert.deepEqual(parseHubspotRefId("company:456"), {
      kind: "company",
      objectId: "456",
    });
  });

  it("serializes hubspot composer markers", () => {
    const marker = formatRefMarker(
      "hubspot",
      "contact:843732000997",
      "Louis Arnold",
    );
    assert.equal(
      marker,
      "[[ref:hubspot:contact:843732000997|Louis Arnold]]",
    );
    assert.deepEqual(parseRefMarkers(marker), [
      {
        service: "hubspot",
        id: "contact:843732000997",
        name: "Louis Arnold",
        raw: marker,
        index: 0,
      },
    ]);
    assert.equal(toDisplayText(`About ${marker}`), "About @Louis Arnold");
  });

  it("detects sole pasted HubSpot URLs", () => {
    assert.equal(
      isSoleHubspotCrmUrl(
        "  https://app.hubspot.com/contacts/1/record/0-1/2  ",
      ),
      true,
    );
    assert.equal(
      isSoleHubspotCrmUrl(
        "see https://app.hubspot.com/contacts/1/record/0-1/2",
      ),
      false,
    );
  });
});
