import { beginTurn, endTurn } from "../dsl.ts";
import type { ChatLabScenario } from "../types.ts";

const userMessage =
  "Verify the Companies House number on Acme in HubSpot — is it still the same legal entity?";

export const companiesHouseScenario: ChatLabScenario = {
  id: "companies-house",
  label: "Companies House",
  description: "Researcher verifies a HubSpot CH number, then searches after a mismatch",
  userMessage,
  events: endTurn(
    beginTurn(userMessage)
      .streamReasoning(
        "## Checking the registry\nHubSpot should already have companies_house_no. I’ll send researcher to verify it live, then flag any mismatch.",
      )
      .subagentBatch([
        {
          name: "researcher",
          task: "Resolve Acme in HubSpot (include companies_house_no and registered_company_name). If a number is present, get_company_profile and compare legal name/status. If the number 404s, search_companies_house by trading name and list candidates — do not invent a number.",
          innerBeats: [
            { kind: "reason", text: "Need HubSpot companies_house_no first, then the live profile." },
            {
              kind: "tool",
              toolName: "hubspot__search_crm_objects",
              input: {
                query: "Acme",
                objectType: "COMPANY",
                properties: ["name", "companies_house_no", "registered_company_name"],
              },
              output: {
                results: [
                  {
                    name: "Acme",
                    companies_house_no: "99999999",
                    registered_company_name: "ACME ROBOTICS LTD",
                  },
                ],
              },
            },
            {
              kind: "tool",
              toolName: "get_company_profile",
              input: { company_number: "99999999" },
              output: {
                error: "not_found",
                company_number: "99999999",
                message: "No Companies House company with number 99999999.",
                url: "https://find-and-update.company-information.service.gov.uk/company/99999999",
              },
            },
            {
              kind: "tool",
              toolName: "search_companies_house",
              input: { query: "Acme Robotics" },
              output: {
                items: [
                  {
                    company_number: "SC123456",
                    title: "ACME ROBOTICS LTD",
                    company_status: "active",
                    url: "https://find-and-update.company-information.service.gov.uk/company/SC123456",
                  },
                ],
              },
            },
            {
              kind: "write",
              text: "HubSpot number 99999999 is not a live company. Closest match is ACME ROBOTICS LTD SC123456 (active).",
            },
          ],
          result:
            "HubSpot companies_house_no 99999999 is wrong (not found). Live match: ACME ROBOTICS LTD SC123456, active. Gap: HubSpot number needs correcting.",
        },
      ])
      .nextStep()
      .streamReasoning(
        "## Registry vs CRM\nThe number on the CRM record is stale. The live company is SC123456.",
      )
      .streamText(
        `HubSpot’s Companies House number for Acme ([99999999](https://find-and-update.company-information.service.gov.uk/company/99999999)) is not a live company.

The registry match is [ACME ROBOTICS LTD (SC123456)](https://find-and-update.company-information.service.gov.uk/company/SC123456), status active. Treat the HubSpot field as wrong until someone updates it.`,
      ),
  ),
};
