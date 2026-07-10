import type { ConnectorDef, ConnectorStatus } from "#shared/types/connector";
import { CONNECT_USER_ISSUER } from "#shared/connect";
import type { ConnectTokenSubject } from "@vercel/connect";
import {
  ConnectError,
  ConnectorInstallationRequiredError,
  getTokenResponse,
  NoValidTokenError,
  revokeToken,
  startAuthorization,
  UserAuthorizationRequiredError,
} from "@vercel/connect";

function authMode(def: ConnectorDef): "user" | "app" | "env" {
  return def.authMode ?? "user";
}

function envToken(def: ConnectorDef): string | null {
  const key = def.staticTokenEnv ?? "PLATFORM_MCP_TOKEN";
  const token = process.env[key]?.trim();
  return token && token.length > 0 ? token : null;
}

function envMcpUrl(def: ConnectorDef): string | null {
  const key = def.mcpUrlEnv ?? "PLATFORM_MCP_URL";
  const url = process.env[key]?.trim();
  return url && url.length > 0 ? url : null;
}

function userSubjects(userId: string): ConnectTokenSubject[] {
  const subjects: ConnectTokenSubject[] = [
    { type: "user", id: userId, issuer: CONNECT_USER_ISSUER },
    { type: "user", id: userId },
  ];

  const authUrl = process.env.BETTER_AUTH_URL?.trim();
  if (authUrl) {
    subjects.push({ type: "user", id: userId, issuer: authUrl });
  }

  return subjects;
}

function tokenParams(
  def: ConnectorDef,
  subject: ConnectTokenSubject,
  installationId?: string,
) {
  return {
    subject,
    ...(def.scopes.length ? { scopes: def.scopes } : {}),
    ...(installationId ? { installationId } : {}),
  };
}

function isMissingGrantError(error: unknown) {
  return error instanceof UserAuthorizationRequiredError
    || error instanceof NoValidTokenError;
}

function connectCreateCommand(def: ConnectorDef) {
  if (def.id === "drive") {
    return `vercel connect create https://drivemcp.googleapis.com/mcp/v1 --name codebase-agent`;
  }
  if (def.id === "hubspot") {
    return `vercel connect create mcp.hubspot.com --name codebase-agent`;
  }
  if (def.id === "notion") {
    return `vercel connect create mcp.notion.com --name codebase-agent`;
  }
  if (def.id === "tally") {
    return `vercel connect create https://api.tally.so/mcp --name agent-c`;
  }
  if (def.id === "slack") {
    return `vercel connect create slack --name v`;
  }
  return `vercel connect create ${def.id} --name codebase-agent`;
}

function formatSetupHint(def: ConnectorDef, reason: "missing" | "not_linked") {
  if (reason === "missing") {
    return [
      "Create the connector, then attach it to this project:",
      connectCreateCommand(def),
      `vercel connect attach ${def.connector}`,
      "Update the connector UID in shared/connect.ts if it differs from `vercel connect list`.",
    ].join("\n");
  }

  return `Run: vercel connect attach ${def.connector}`;
}

function mapConnectError(error: unknown, def: ConnectorDef): ConnectorStatus {
  if (isMissingGrantError(error)) {
    return { state: "not_connected" };
  }

  if (error instanceof ConnectorInstallationRequiredError) {
    return { state: "installation_required" };
  }

  if (error instanceof ConnectError) {
    const code = error.code?.toLowerCase();
    const message = error.message.toLowerCase();

    if (
      code === "connector_not_found"
      || code === "client_not_found"
      || message.includes("connector not found")
      || message.includes("no connector found")
    ) {
      return {
        state: "setup_required",
        message: `Connector "${def.connector}" is not registered on your Vercel team.`,
        hint: formatSetupHint(def, "missing"),
      };
    }

    if (
      code === "client_not_linked_to_project"
      || code === "client_not_enabled_for_environment"
      || message.includes("not linked")
      || message.includes("not enabled for environment")
    ) {
      return {
        state: "setup_required",
        message: `Connector "${def.connector}" is not attached to this project.`,
        hint: formatSetupHint(def, "not_linked"),
      };
    }

    if (
      message.includes("dynamic client registration")
      || message.includes("registration_endpoint")
    ) {
      const driveHint = def.id === "drive"
        ? [
            "Google Drive does not support dynamic client registration.",
            "Create a GCP OAuth client (drive.readonly scope), then:",
            connectCreateCommand(def),
            `vercel connect attach ${def.connector}`,
            "See docs/ENVIRONMENT.md for the full Drive MCP setup.",
          ].join("\n")
        : formatSetupHint(def, "missing");

      return {
        state: "setup_required",
        message: `Connector "${def.connector}" needs provider OAuth credentials before users can connect.`,
        hint: driveHint,
      };
    }

    return { state: "error", message: error.message };
  }

  if (error instanceof Error) {
    return { state: "error", message: error.message };
  }

  return { state: "error", message: "Unknown Connect error" };
}

async function withAppTokenResponse(
  def: ConnectorDef,
  installationId?: string,
) {
  return getTokenResponse(
    def.connector,
    tokenParams(def, { type: "app" }, installationId),
  );
}

async function withUserTokenResponse(
  def: ConnectorDef,
  userId: string,
  installationId?: string,
) {
  let lastError: unknown;

  for (const subject of userSubjects(userId)) {
    try {
      return await getTokenResponse(
        def.connector,
        tokenParams(def, subject, installationId),
      );
    }
    catch (error) {
      lastError = error;
      if (!isMissingGrantError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function withTokenResponse(
  def: ConnectorDef,
  userId: string,
  installationId?: string,
) {
  if (authMode(def) === "app") {
    return withAppTokenResponse(def, installationId);
  }
  return withUserTokenResponse(def, userId, installationId);
}

export async function probeStatus(def: ConnectorDef, userId: string): Promise<ConnectorStatus> {
  if (authMode(def) === "env") {
    const token = envToken(def);
    const url = envMcpUrl(def);
    if (token && url) {
      return {
        state: "connected",
        label: "Configured via env",
      };
    }
    return {
      state: "setup_required",
      message: "Platform MCP is not configured",
      hint: [
        `Set ${def.staticTokenEnv ?? "PLATFORM_MCP_TOKEN"} and ${def.mcpUrlEnv ?? "PLATFORM_MCP_URL"} on the Eve runtime (and matching token on CodeBase Platform).`,
        "No OAuth connect step — restart after updating env.",
      ].join("\n"),
    };
  }

  try {
    const response = await withTokenResponse(def, userId);

    return {
      state: "connected",
      installationId: response.installationId,
      label: response.name,
    };
  }
  catch (error) {
    return mapConnectError(error, def);
  }
}

export async function mintUserToken(
  def: ConnectorDef,
  userId: string,
  installationId?: string,
): Promise<string> {
  if (authMode(def) === "env") {
    const token = envToken(def);
    if (!token) {
      throw new Error(`${def.staticTokenEnv ?? "PLATFORM_MCP_TOKEN"} is not set`);
    }
    return token;
  }

  const response = await withTokenResponse(def, userId, installationId);
  return response.token;
}

export async function startConnectFlow(
  def: ConnectorDef,
  userId: string,
  callbackUrl: string,
) {
  if (authMode(def) === "env") {
    throw new Error(
      "CodeBase Platform MCP is configured via env vars — there is no OAuth connect flow.",
    );
  }

  if (authMode(def) === "app") {
    // App-scoped connectors are non-interactive; probing/minting is enough.
    // Still expose startAuthorization with an app subject so operators can
    // complete any Connect install step the provider requires.
    return startAuthorization(
      def.connector,
      tokenParams(def, { type: "app" }, undefined),
      { callbackUrl },
    );
  }

  return startAuthorization(
    def.connector,
    tokenParams(def, userSubjects(userId)[0]!, undefined),
    { callbackUrl },
  );
}

export function isValidEveResumeUrl(url: string, origin: string) {
  try {
    const parsed = new URL(url);
    const expected = new URL(origin);

    if (parsed.origin !== expected.origin) {
      return false;
    }

    return /^\/eve\/v1\/connections\/[^/]+\/callback\/[^/]+$/.test(parsed.pathname);
  }
  catch {
    return false;
  }
}

export async function revokeConnection(
  def: ConnectorDef,
  userId: string,
  installationId?: string,
): Promise<void> {
  if (authMode(def) === "env") {
    throw new Error(
      "CodeBase Platform MCP is configured via env vars — unset PLATFORM_MCP_TOKEN to disable.",
    );
  }

  if (authMode(def) === "app") {
    await revokeToken(def.connector, {
      subject: { type: "app" },
      ...(installationId ? { installationId } : {}),
    });
    return;
  }

  let lastError: unknown;

  for (const subject of userSubjects(userId)) {
    try {
      await revokeToken(def.connector, {
        subject,
        ...(installationId ? { installationId } : {}),
      });
      return;
    }
    catch (error) {
      lastError = error;
      if (!isMissingGrantError(error)) {
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }
}
