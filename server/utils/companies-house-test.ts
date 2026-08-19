/** Companies House Public Data API — Integrations Test probe (shared API key). */

const COMPANIES_HOUSE_API_BASE = "https://api.company-information.service.gov.uk";
/** CH's documented example company. */
const TEST_COMPANY_NUMBER = "00000006";

export async function testCompaniesHouseConnection(token: string): Promise<string[]> {
  const url = `${COMPANIES_HOUSE_API_BASE}/company/${TEST_COMPANY_NUMBER}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${token}:`).toString("base64")}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Companies House API error: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`,
    );
  }

  const data = await res.json() as {
    company_name?: string;
    company_number?: string;
    company_status?: string;
  };

  const name = data.company_name ?? "Companies House";
  const number = data.company_number ?? TEST_COMPANY_NUMBER;
  return [
    `${name} (${number})`,
    data.company_status ? `Status: ${data.company_status}` : "Profile reachable",
    "Use chat for live lookup (search_companies_house, get_company_profile)",
  ];
}
