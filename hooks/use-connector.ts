"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ConnectorSummary } from "#shared/types/connector";
import { getErrorStatus, getSetupStatus } from "#shared/utils/status";
import { connectorStatusLabel, parseTestResult, testResultsHeading } from "~/lib/connector-status";
import { getFetchErrorMessage } from "~/lib/fetch-error";
import { queryKeys } from "~/lib/query-keys";

/**
 * Connect / test / revoke actions and derived UI state for one connector row.
 */
export function useConnector(connector: ConnectorSummary) {
  const queryClient = useQueryClient();

  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);
  const [testResults, setTestResults] = useState<string[] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const status = connectorStatusLabel(connector.status.state);
  const canConnect
    = connector.authMode !== "env"
      && (connector.status.state === "not_connected" || connector.status.state === "installation_required");
  const isConnected = connector.status.state === "connected";
  const canRevoke = isConnected && connector.authMode !== "env";
  const needsSetup = connector.status.state === "setup_required";
  const setupStatus = getSetupStatus(connector.status);
  const errorStatus = getErrorStatus(connector.status);
  const hintLines = setupStatus?.hint?.split("\n").filter(Boolean) ?? [];
  const parsedResults = (testResults ?? []).map((line) => parseTestResult(line));
  const resultsHeading = testResultsHeading(connector.id);

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: queryKeys.connectors });
  }

  async function connect() {
    setConnecting(true);
    setActionError(null);
    try {
      const { url } = await fetch(`/api/integrations/${connector.id}/connect`, {
        method: "POST",
      }).then((r) => r.json() as Promise<{ url: string }>);
      window.location.assign(url);
    }
    catch (error) {
      setActionError(getFetchErrorMessage(error));
    }
    finally {
      setConnecting(false);
    }
  }

  async function test() {
    setTesting(true);
    setActionError(null);
    setTestResults(null);
    setShowTestResults(false);
    try {
      const res = await fetch(`/api/integrations/${connector.id}/test`, {
        method: "POST",
      });
      const body = await res.json() as { results?: string[]; message?: string };
      if (!res.ok) {
        throw new Error(body.message ?? `Test failed (${res.status})`);
      }
      setTestResults(body.results ?? []);
      setShowTestResults(true);
      await refresh();
    }
    catch (error) {
      setActionError(getFetchErrorMessage(error));
    }
    finally {
      setTesting(false);
    }
  }

  async function revoke() {
    setRevoking(true);
    setActionError(null);
    try {
      await fetch(`/api/integrations/${connector.id}/revoke`, { method: "POST" });
      setTestResults(null);
      setShowTestResults(false);
      setShowRevokeModal(false);
      await refresh();
    }
    catch (error) {
      setActionError(getFetchErrorMessage(error));
    }
    finally {
      setRevoking(false);
    }
  }

  function clearResults() {
    setTestResults(null);
    setShowTestResults(false);
  }

  return {
    status,
    canConnect,
    isConnected,
    canRevoke,
    needsSetup,
    setupStatus,
    errorStatus,
    hintLines,
    connecting,
    testing,
    revoking,
    showRevokeModal,
    setShowRevokeModal,
    showTestResults,
    testResults,
    actionError,
    parsedResults,
    resultsHeading,
    connect,
    test,
    revoke,
    clearResults,
  };
}
