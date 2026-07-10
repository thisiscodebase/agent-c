export type ConnectorStatus
  = { state: "connected"; installationId?: string; label?: string }
    | { state: "not_connected" }
    | { state: "installation_required" }
    | { state: "setup_required"; message: string; hint?: string }
    | { state: "error"; message: string };

export type ConnectorState = ConnectorStatus["state"];

/** API response — one row in the integrations hub. */
export interface ConnectorSummary {
  id: string;
  name: string;
  description: string;
  icon: string;
  connectorUid: string;
  connectionName: string;
  testLabel: string;
  status: ConnectorStatus;
  connectedAs?: string;
  /** How credentials are obtained. Env-managed connectors skip OAuth UI. */
  authMode?: "user" | "app" | "env";
}

/** Server registry entry in `server/connectors.ts`. */
export interface ConnectorDef {
  id: string;
  name: string;
  description: string;
  /** Vercel Connect connector UID — must match `agent/connections/<id>.ts`. */
  connector: string;
  /** Eve connection name from `agent/connections/<connectionName>.ts`. */
  connectionName: string;
  icon: string;
  scopes: string[];
  /**
   * Token subject for status/test/connect flows.
   * Defaults to `"user"` (interactive OAuth). Use `"app"` for shared
   * Connect credentials. Use `"env"` for a shared bearer from env vars
   * (no Connect / no OAuth UI).
   */
  authMode?: "user" | "app" | "env";
  /** Env var holding the shared bearer when `authMode` is `"env"`. */
  staticTokenEnv?: string;
  /** Env var holding the MCP URL when `authMode` is `"env"` (for test probes). */
  mcpUrlEnv?: string;
  test: {
    label: string;
    run: (token: string) => Promise<string[]>;
  };
}

export interface ParsedTestResult {
  id?: string;
  tag?: string;
  title: string;
}
