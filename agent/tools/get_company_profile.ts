import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CompaniesHouseError,
  getCompaniesHouseApiKey,
  getCompanyProfile,
  notFoundResult,
} from "../lib/companies-house-api.js";

/**
 * Companies House company profile (public data, shared API key).
 *
 * @see https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference
 */
export default defineTool({
  description:
    "Get the live Companies House profile for a UK company number (status, type, registered office, SIC, accounts due/overdue). Prefer this when HubSpot has companies_house_no. Compare legal name/status to HubSpot; if 404, search by name instead of inventing a number.",
  inputSchema: z.object({
    company_number: z
      .string()
      .min(1)
      .describe(
        "UK company number (e.g. 12345678, SC123456). Numeric values are padded to 8 digits.",
      ),
  }),
  async execute({ company_number }) {
    const apiKey = getCompaniesHouseApiKey();
    try {
      return await getCompanyProfile(apiKey, company_number);
    } catch (error) {
      if (error instanceof CompaniesHouseError && error.status === 404) {
        return notFoundResult(company_number);
      }
      throw error;
    }
  },
});
