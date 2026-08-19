import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CompaniesHouseError,
  getCompaniesHouseApiKey,
  listCompanyFilings,
  notFoundResult,
} from "../lib/companies-house-api.js";

/**
 * Companies House filing history (public data, shared API key).
 * Lists metadata only — does not download account PDFs.
 *
 * @see https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference
 */
export default defineTool({
  description:
    "List Companies House filing history for a UK company number. Filter to category accounts for accounts filings (dates/descriptions only — no PDF ingest). Cite the filing-history permalink from the result.",
  inputSchema: z.object({
    company_number: z
      .string()
      .min(1)
      .describe("UK company number from HubSpot companies_house_no or search_companies_house."),
    category: z
      .string()
      .optional()
      .describe(
        "Optional filing category filter (e.g. accounts, confirmation-statement, officers, incorporation).",
      ),
    itemsPerPage: z
      .number()
      .int()
      .min(1)
      .max(25)
      .optional()
      .describe("Max filings (1–25). Defaults to 10."),
  }),
  async execute({ company_number, category, itemsPerPage }) {
    const apiKey = getCompaniesHouseApiKey();
    try {
      return await listCompanyFilings(apiKey, company_number, {
        category,
        itemsPerPage,
      });
    } catch (error) {
      if (error instanceof CompaniesHouseError && error.status === 404) {
        return notFoundResult(company_number);
      }
      throw error;
    }
  },
});
