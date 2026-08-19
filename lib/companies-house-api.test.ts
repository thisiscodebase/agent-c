import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMPANIES_HOUSE_API_BASE,
  COMPANIES_HOUSE_FIND_ORIGIN,
  CompaniesHouseError,
  companyPermalink,
  formatAddress,
  getCompanyProfile,
  getCompaniesHouseApiKey,
  listCompanyFilings,
  listCompanyOfficers,
  normalizeCompanyNumber,
  notFoundResult,
  searchCompaniesHouse,
} from "../agent/lib/companies-house-api.ts";

describe("normalizeCompanyNumber", () => {
  it("pads numeric numbers to 8 digits and uppercases prefixes", () => {
    assert.equal(normalizeCompanyNumber("6"), "00000006");
    assert.equal(normalizeCompanyNumber("00000006"), "00000006");
    assert.equal(normalizeCompanyNumber("sc 123456"), "SC123456");
    assert.equal(normalizeCompanyNumber("NI-123456"), "NI123456");
  });
});

describe("permalinks", () => {
  it("builds find-and-update company URLs", () => {
    assert.equal(
      companyPermalink("SC123456"),
      `${COMPANIES_HOUSE_FIND_ORIGIN}/company/SC123456`,
    );
  });
});

describe("formatAddress", () => {
  it("joins present lines", () => {
    assert.equal(
      formatAddress({
        address_line_1: "Argyle House",
        locality: "Edinburgh",
        postal_code: "EH3 9DR",
        country: "United Kingdom",
      }),
      "Argyle House, Edinburgh, EH3 9DR, United Kingdom",
    );
    assert.equal(formatAddress(undefined), undefined);
  });
});

describe("getCompaniesHouseApiKey", () => {
  it("throws when the env var is missing", () => {
    const previous = process.env.COMPANIES_HOUSE_API_KEY;
    delete process.env.COMPANIES_HOUSE_API_KEY;
    try {
      assert.throws(() => getCompaniesHouseApiKey(), /COMPANIES_HOUSE_API_KEY/);
    } finally {
      if (previous === undefined) {
        delete process.env.COMPANIES_HOUSE_API_KEY;
      } else {
        process.env.COMPANIES_HOUSE_API_KEY = previous;
      }
    }
  });
});

describe("Companies House HTTP helpers", () => {
  it("maps search hits and attaches permalinks", async () => {
    const fetchMock: typeof fetch = async (input) => {
      assert.equal(
        String(input),
        `${COMPANIES_HOUSE_API_BASE}/search/companies?q=CodeBase&items_per_page=10`,
      );
      return Response.json({
        total_results: 1,
        items: [
          {
            company_number: "SC123456",
            title: "CODEBASE LTD",
            company_status: "active",
            address_snippet: "Edinburgh",
          },
        ],
      });
    };

    const result = await searchCompaniesHouse("key", "CodeBase", {}, { fetch: fetchMock });
    assert.equal(result.total_results, 1);
    assert.equal(result.items[0]?.company_number, "SC123456");
    assert.equal(
      result.items[0]?.url,
      `${COMPANIES_HOUSE_FIND_ORIGIN}/company/SC123456`,
    );
  });

  it("maps a company profile and pads the number", async () => {
    const fetchMock: typeof fetch = async (input) => {
      assert.equal(String(input), `${COMPANIES_HOUSE_API_BASE}/company/00000006`);
      return Response.json({
        company_number: "00000006",
        company_name: "MARINE STEAM TURBINE COMPANY, LIMITED",
        company_status: "dissolved",
        registered_office_address: {
          locality: "London",
          postal_code: "EC4A 1AB",
        },
        accounts: { overdue: false },
      });
    };

    const profile = await getCompanyProfile("key", "6", { fetch: fetchMock });
    assert.equal(profile.company_number, "00000006");
    assert.equal(profile.registered_office_snippet, "London, EC4A 1AB");
    assert.equal(profile.url, `${COMPANIES_HOUSE_FIND_ORIGIN}/company/00000006`);
  });

  it("filters resigned officers unless asked", async () => {
    const fetchMock: typeof fetch = async () =>
      Response.json({
        active_count: 1,
        resigned_count: 1,
        items: [
          { name: "Ada Lovelace", officer_role: "director", appointed_on: "2020-01-01" },
          {
            name: "Resigned Person",
            officer_role: "secretary",
            appointed_on: "2018-01-01",
            resigned_on: "2019-01-01",
          },
        ],
      });

    const active = await listCompanyOfficers("key", "SC1", {}, { fetch: fetchMock });
    assert.equal(active.officers.length, 1);
    assert.equal(active.officers[0]?.name, "Ada Lovelace");

    const all = await listCompanyOfficers(
      "key",
      "SC1",
      { includeResigned: true },
      { fetch: fetchMock },
    );
    assert.equal(all.officers.length, 2);
  });

  it("lists filings with a category filter", async () => {
    const fetchMock: typeof fetch = async (input) => {
      assert.match(String(input), /category=accounts/);
      return Response.json({
        total_count: 1,
        items: [
          {
            date: "2025-03-01",
            type: "AA",
            category: "accounts",
            description: "accounts-with-accounts-type-micro-entity",
          },
        ],
      });
    };

    const result = await listCompanyFilings(
      "key",
      "SC123456",
      { category: "accounts" },
      { fetch: fetchMock },
    );
    assert.equal(result.filings.length, 1);
    assert.equal(result.filings[0]?.category, "accounts");
    assert.equal(
      result.url,
      `${COMPANIES_HOUSE_FIND_ORIGIN}/company/SC123456/filing-history`,
    );
  });

  it("retries once on 429 then succeeds", async () => {
    let calls = 0;
    const fetchMock: typeof fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "0" },
        });
      }
      return Response.json({
        company_number: "00000006",
        company_name: "Example",
      });
    };

    const sleeps: number[] = [];
    const profile = await getCompanyProfile("key", "00000006", {
      fetch: fetchMock,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    assert.equal(calls, 2);
    assert.deepEqual(sleeps, [0]);
    assert.equal(profile.company_name, "Example");
  });

  it("throws CompaniesHouseError on 404", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(JSON.stringify({ errors: [{ error: "company-profile-not-found" }] }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });

    await assert.rejects(
      () => getCompanyProfile("key", "99999999", { fetch: fetchMock }),
      (error: unknown) => {
        assert.ok(error instanceof CompaniesHouseError);
        assert.equal(error.status, 404);
        assert.equal(error.companyNumber, "99999999");
        return true;
      },
    );
  });
});

describe("notFoundResult", () => {
  it("tells the model to search instead of inventing a number", () => {
    const result = notFoundResult("6");
    assert.equal(result.error, "not_found");
    assert.equal(result.company_number, "00000006");
    assert.match(result.message, /do not invent/i);
  });
});
