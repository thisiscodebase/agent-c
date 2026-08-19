import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CompaniesHouseError,
  getCompaniesHouseApiKey,
  listCompanyOfficers,
  notFoundResult,
} from "../lib/companies-house-api.js";

/**
 * Companies House officers list (public data, shared API key).
 *
 * @see https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference
 */
export default defineTool({
  description:
    "List Companies House officers (directors/secretaries) for a UK company number. Defaults to active officers. Cite the officers permalink from the result.",
  inputSchema: z.object({
    company_number: z
      .string()
      .min(1)
      .describe("UK company number from HubSpot companies_house_no or search_companies_house."),
    includeResigned: z
      .boolean()
      .optional()
      .describe("If true, include resigned officers. Defaults to active only."),
    itemsPerPage: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Max officers to return (1–50). Defaults to 35."),
  }),
  async execute({ company_number, includeResigned, itemsPerPage }) {
    const apiKey = getCompaniesHouseApiKey();
    try {
      return await listCompanyOfficers(apiKey, company_number, {
        includeResigned,
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
