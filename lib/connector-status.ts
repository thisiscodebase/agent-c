import type { ConnectorState, ParsedTestResult } from "#shared/types/connector";

export function connectorStatusLabel(state: ConnectorState) {
  switch (state) {
    case "connected":
      return { label: "Connected", variant: "default" as const };
    case "installation_required":
      return { label: "Install required", variant: "secondary" as const };
    case "setup_required":
      return { label: "Setup required", variant: "secondary" as const };
    case "error":
      return { label: "Error", variant: "destructive" as const };
    default:
      return { label: "Not connected", variant: "outline" as const };
  }
}

export function parseTestResult(line: string): ParsedTestResult {
  const withId = line.match(/^([A-Z]+-\d+)\s*[—-]\s*(.+)$/);
  if (withId?.[1] && withId[2]) {
    return { id: withId[1], title: withId[2] };
  }

  const withTag = line.match(/^(\[[^\]]+\])\s*(.+)$/);
  if (withTag?.[1] && withTag[2]) {
    return { tag: withTag[1].slice(1, -1), title: withTag[2] };
  }

  return { title: line };
}

export function testResultsHeading(connectorId: string) {
  if (connectorId === "github") {
    return "Repositories";
  }
  return "Results";
}
