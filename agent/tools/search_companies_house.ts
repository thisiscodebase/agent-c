import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getCompaniesHouseApiKey,
  searchCompaniesHouse,
} from "../lib/companies-house-api.js";

/**
 * Companies House company search (public data, shared API key).
 *
 * @see https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference
 */
export default defineTool({
  description:
    "Search UK Companies House by company name or number. Use after HubSpot when companies_house_no is missing or a profile 404s. Results include find-and-update permalinks — cite those; never invent a company number.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe("Company name, trading name, or company number to search."),
    itemsPerPage: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Max results (1–20). Defaults to 10."),
  }),
  async execute({ query, itemsPerPage }) {
    const apiKey = getCompaniesHouseApiKey();
    return searchCompaniesHouse(apiKey, query, { itemsPerPage });
  },
});
