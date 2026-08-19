/**
 * Companies House Public Data API client (shared API key, HTTP Basic).
 *
 * @see https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference
 */

export const COMPANIES_HOUSE_API_BASE
  = "https://api.company-information.service.gov.uk";

export const COMPANIES_HOUSE_FIND_ORIGIN
  = "https://find-and-update.company-information.service.gov.uk";

export const COMPANIES_HOUSE_API_KEY_ENV = "COMPANIES_HOUSE_API_KEY";

/** CH's documented example company (used by Integrations test). */
export const COMPANIES_HOUSE_TEST_COMPANY_NUMBER = "00000006";

const DEFAULT_RETRY_AFTER_MS = 5_000;
const MAX_RETRY_AFTER_MS = 30_000;

export type CompaniesHouseFetchDeps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export class CompaniesHouseError extends Error {
  readonly status: number;
  readonly companyNumber?: string;

  constructor(message: string, status: number, companyNumber?: string) {
    super(message);
    this.name = "CompaniesHouseError";
    this.status = status;
    this.companyNumber = companyNumber;
  }
}

export type CompaniesHouseAddress = {
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  region?: string;
  postal_code?: string;
  country?: string;
};

export type CompanySearchHit = {
  company_number: string;
  title: string;
  company_status?: string;
  company_type?: string;
  date_of_creation?: string;
  address_snippet?: string;
  description?: string;
  url: string;
};

export type CompanyProfile = {
  company_number: string;
  company_name: string;
  company_status?: string;
  company_status_detail?: string;
  type?: string;
  date_of_creation?: string;
  date_of_cessation?: string;
  jurisdiction?: string;
  sic_codes?: string[];
  has_insolvency_history?: boolean;
  has_charges?: boolean;
  registered_office?: CompaniesHouseAddress;
  registered_office_snippet?: string;
  accounts?: {
    overdue?: boolean;
    next_due?: string;
    next_made_up_to?: string;
    last_accounts?: {
      made_up_to?: string;
      type?: string;
      period_end_on?: string;
    };
  };
  confirmation_statement?: {
    overdue?: boolean;
    next_due?: string;
    last_made_up_to?: string;
  };
  url: string;
};

export type CompanyOfficer = {
  name: string;
  officer_role?: string;
  appointed_on?: string;
  resigned_on?: string;
  nationality?: string;
  occupation?: string;
  address_snippet?: string;
};

export type CompanyFiling = {
  date?: string;
  type?: string;
  category?: string;
  description?: string;
  pages?: number;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getCompaniesHouseApiKey(): string {
  const key = process.env[COMPANIES_HOUSE_API_KEY_ENV]?.trim();
  if (!key) {
    throw new Error(
      `${COMPANIES_HOUSE_API_KEY_ENV} is not configured. Set it on the Eve runtime and web (Settings → Integrations).`,
    );
  }
  return key;
}

/** Trim, uppercase, strip separators; pad purely numeric numbers to 8 digits. */
export function normalizeCompanyNumber(input: string): string {
  const trimmed = input.trim().toUpperCase().replace(/[\s-]/g, "");
  if (/^\d{1,8}$/.test(trimmed)) {
    return trimmed.padStart(8, "0");
  }
  return trimmed;
}

export function companyPermalink(companyNumber: string): string {
  return `${COMPANIES_HOUSE_FIND_ORIGIN}/company/${encodeURIComponent(companyNumber)}`;
}

export function companyOfficersPermalink(companyNumber: string): string {
  return `${companyPermalink(companyNumber)}/officers`;
}

export function companyFilingHistoryPermalink(companyNumber: string): string {
  return `${companyPermalink(companyNumber)}/filing-history`;
}

export function formatAddress(
  address: CompaniesHouseAddress | undefined,
): string | undefined {
  if (!address) return undefined;
  const parts = [
    address.address_line_1,
    address.address_line_2,
    address.locality,
    address.region,
    address.postal_code,
    address.country,
  ].filter((part): part is string => Boolean(part?.trim()));
  return parts.length > 0 ? parts.join(", ") : undefined;
}

function basicAuthHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

function retryAfterMs(res: Response): number {
  const raw = res.headers.get("retry-after");
  if (!raw) return DEFAULT_RETRY_AFTER_MS;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }
  return DEFAULT_RETRY_AFTER_MS;
}

async function readErrorDetail(res: Response): Promise<string> {
  const fallback = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json() as {
      errors?: Array<{ error?: string }>;
      error?: string;
    };
    const first = body.errors?.[0]?.error ?? body.error;
    return first ? `${fallback}: ${first}` : fallback;
  } catch {
    return fallback;
  }
}

export async function companiesHouseGetJson<T>(
  apiKey: string,
  path: string,
  deps: CompaniesHouseFetchDeps = {},
): Promise<T> {
  const fetchFn = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? defaultSleep;
  const url = path.startsWith("http")
    ? path
    : `${COMPANIES_HOUSE_API_BASE}${path}`;

  const request = () =>
    fetchFn(url, {
      headers: {
        Authorization: basicAuthHeader(apiKey),
        Accept: "application/json",
      },
    });

  let res = await request();
  if (res.status === 429) {
    await sleep(retryAfterMs(res));
    res = await request();
  }

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    const numberMatch = path.match(/\/company\/([^/?]+)/);
    throw new CompaniesHouseError(
      `Companies House API error: ${detail}`,
      res.status,
      numberMatch?.[1] ? decodeURIComponent(numberMatch[1]) : undefined,
    );
  }

  return res.json() as Promise<T>;
}

type SearchApiResponse = {
  items?: Array<{
    company_number?: string;
    title?: string;
    company_status?: string;
    company_type?: string;
    date_of_creation?: string;
    address_snippet?: string;
    description?: string;
  }>;
  items_per_page?: number;
  start_index?: number;
  total_results?: number;
};

export async function searchCompaniesHouse(
  apiKey: string,
  query: string,
  options: { itemsPerPage?: number; startIndex?: number } = {},
  deps: CompaniesHouseFetchDeps = {},
): Promise<{
  items: CompanySearchHit[];
  total_results?: number;
  start_index?: number;
  items_per_page?: number;
}> {
  const params = new URLSearchParams({ q: query.trim() });
  params.set("items_per_page", String(options.itemsPerPage ?? 10));
  if (options.startIndex != null) {
    params.set("start_index", String(options.startIndex));
  }

  const data = await companiesHouseGetJson<SearchApiResponse>(
    apiKey,
    `/search/companies?${params}`,
    deps,
  );

  const items = (data.items ?? [])
    .filter((item): item is typeof item & { company_number: string } =>
      Boolean(item.company_number),
    )
    .map((item) => {
      const company_number = normalizeCompanyNumber(item.company_number);
      return {
        company_number,
        title: item.title ?? company_number,
        company_status: item.company_status,
        company_type: item.company_type,
        date_of_creation: item.date_of_creation,
        address_snippet: item.address_snippet,
        description: item.description,
        url: companyPermalink(company_number),
      };
    });

  return {
    items,
    total_results: data.total_results,
    start_index: data.start_index,
    items_per_page: data.items_per_page,
  };
}

type ProfileApiResponse = {
  company_number?: string;
  company_name?: string;
  company_status?: string;
  company_status_detail?: string;
  type?: string;
  date_of_creation?: string;
  date_of_cessation?: string;
  jurisdiction?: string;
  sic_codes?: string[];
  has_insolvency_history?: boolean;
  has_charges?: boolean;
  registered_office_address?: CompaniesHouseAddress;
  accounts?: CompanyProfile["accounts"];
  confirmation_statement?: CompanyProfile["confirmation_statement"];
};

export async function getCompanyProfile(
  apiKey: string,
  companyNumber: string,
  deps: CompaniesHouseFetchDeps = {},
): Promise<CompanyProfile> {
  const number = normalizeCompanyNumber(companyNumber);
  const data = await companiesHouseGetJson<ProfileApiResponse>(
    apiKey,
    `/company/${encodeURIComponent(number)}`,
    deps,
  );
  const resolved = data.company_number
    ? normalizeCompanyNumber(data.company_number)
    : number;
  const registered_office = data.registered_office_address;

  return {
    company_number: resolved,
    company_name: data.company_name ?? resolved,
    company_status: data.company_status,
    company_status_detail: data.company_status_detail,
    type: data.type,
    date_of_creation: data.date_of_creation,
    date_of_cessation: data.date_of_cessation,
    jurisdiction: data.jurisdiction,
    sic_codes: data.sic_codes,
    has_insolvency_history: data.has_insolvency_history,
    has_charges: data.has_charges,
    registered_office,
    registered_office_snippet: formatAddress(registered_office),
    accounts: data.accounts,
    confirmation_statement: data.confirmation_statement,
    url: companyPermalink(resolved),
  };
}

type OfficersApiResponse = {
  items?: Array<{
    name?: string;
    officer_role?: string;
    appointed_on?: string;
    resigned_on?: string;
    nationality?: string;
    occupation?: string;
    address?: CompaniesHouseAddress;
  }>;
  active_count?: number;
  resigned_count?: number;
  total_results?: number;
  items_per_page?: number;
  start_index?: number;
};

export async function listCompanyOfficers(
  apiKey: string,
  companyNumber: string,
  options: {
    itemsPerPage?: number;
    startIndex?: number;
    includeResigned?: boolean;
  } = {},
  deps: CompaniesHouseFetchDeps = {},
): Promise<{
  company_number: string;
  officers: CompanyOfficer[];
  active_count?: number;
  resigned_count?: number;
  total_results?: number;
  url: string;
}> {
  const number = normalizeCompanyNumber(companyNumber);
  const params = new URLSearchParams({
    items_per_page: String(options.itemsPerPage ?? 35),
  });
  if (options.startIndex != null) {
    params.set("start_index", String(options.startIndex));
  }

  const data = await companiesHouseGetJson<OfficersApiResponse>(
    apiKey,
    `/company/${encodeURIComponent(number)}/officers?${params}`,
    deps,
  );

  const includeResigned = options.includeResigned === true;
  const officers = (data.items ?? [])
    .filter((item) => item.name)
    .filter((item) => includeResigned || !item.resigned_on)
    .map((item) => ({
      name: item.name!,
      officer_role: item.officer_role,
      appointed_on: item.appointed_on,
      resigned_on: item.resigned_on,
      nationality: item.nationality,
      occupation: item.occupation,
      address_snippet: formatAddress(item.address),
    }));

  return {
    company_number: number,
    officers,
    active_count: data.active_count,
    resigned_count: data.resigned_count,
    total_results: data.total_results,
    url: companyOfficersPermalink(number),
  };
}

type FilingsApiResponse = {
  items?: Array<{
    date?: string;
    type?: string;
    category?: string;
    description?: string;
    pages?: number;
  }>;
  filing_history_status?: string;
  items_per_page?: number;
  start_index?: number;
  total_count?: number;
};

export async function listCompanyFilings(
  apiKey: string,
  companyNumber: string,
  options: {
    category?: string;
    itemsPerPage?: number;
    startIndex?: number;
  } = {},
  deps: CompaniesHouseFetchDeps = {},
): Promise<{
  company_number: string;
  filings: CompanyFiling[];
  filing_history_status?: string;
  total_count?: number;
  url: string;
}> {
  const number = normalizeCompanyNumber(companyNumber);
  const params = new URLSearchParams({
    items_per_page: String(options.itemsPerPage ?? 10),
  });
  if (options.category?.trim()) {
    params.set("category", options.category.trim());
  }
  if (options.startIndex != null) {
    params.set("start_index", String(options.startIndex));
  }

  const data = await companiesHouseGetJson<FilingsApiResponse>(
    apiKey,
    `/company/${encodeURIComponent(number)}/filing-history?${params}`,
    deps,
  );

  const filings = (data.items ?? []).map((item) => ({
    date: item.date,
    type: item.type,
    category: item.category,
    description: item.description,
    pages: item.pages,
  }));

  return {
    company_number: number,
    filings,
    filing_history_status: data.filing_history_status,
    total_count: data.total_count,
    url: companyFilingHistoryPermalink(number),
  };
}

export function notFoundResult(companyNumber: string): {
  error: "not_found";
  company_number: string;
  message: string;
  url: string;
} {
  const number = normalizeCompanyNumber(companyNumber);
  return {
    error: "not_found",
    company_number: number,
    message: `No Companies House company with number ${number}. Search by trading name next — do not invent a number.`,
    url: companyPermalink(number),
  };
}
