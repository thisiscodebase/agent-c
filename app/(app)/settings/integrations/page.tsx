"use client";

import type { ConnectorSummary } from "#shared/types/connector";
import { Suspense } from "react";
import { SettingsGroup, SettingsRow } from "~/components/settings/settings-group";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useConnector } from "~/hooks/use-connector";
import { useConnectors } from "~/hooks/use-connectors";
import { useSlackLink } from "~/hooks/use-slack-link";
import { getToolCategoryIcon } from "~/lib/tool-icons";

function ConnectorRow({ connector }: { connector: ConnectorSummary }) {
  const c = useConnector(connector);

  return (
    <SettingsRow
      description={connector.description}
      leading={getToolCategoryIcon(connector.id, {
        size: 18,
        showBackground: false,
      })}
      title={connector.name}
    >
      <div className="flex flex-col items-end gap-2">
        <Badge variant={c.status.variant}>{c.status.label}</Badge>
        <div className="flex flex-wrap justify-end gap-1.5">
          {c.canConnect ? (
            <Button disabled={c.connecting} size="sm" onClick={() => void c.connect()}>
              {c.connecting ? "Connecting…" : "Connect"}
            </Button>
          ) : null}
          {c.isConnected ? (
            <Button
              disabled={c.testing}
              size="sm"
              variant="outline"
              onClick={() => void c.test()}
            >
              {c.testing ? "Testing…" : connector.testLabel}
            </Button>
          ) : null}
          {c.isConnected && c.canRevoke ? (
            <Dialog open={c.showRevokeModal} onOpenChange={c.setShowRevokeModal}>
              <DialogTrigger render={<Button size="sm" variant="ghost">Revoke</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Revoke {connector.name}?</DialogTitle>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline">Cancel</Button>} />
                  <Button
                    disabled={c.revoking}
                    variant="destructive"
                    onClick={() => void c.revoke()}
                  >
                    {c.revoking ? "Revoking…" : "Revoke"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
        {c.errorStatus ? (
          <p className="max-w-xs text-right text-xs text-destructive">{c.errorStatus.message}</p>
        ) : null}
        {c.actionError ? (
          <p className="max-w-xs text-right text-xs text-destructive">{c.actionError}</p>
        ) : null}
        {c.showTestResults && c.testResults ? (
          <div className="max-w-xs text-right text-xs">
            <p className="font-medium">{c.resultsHeading}</p>
            <ul className="list-inside list-disc">
              {c.parsedResults.map((result) => (
                <li key={result.id ?? result.tag ?? result.title}>{result.title}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </SettingsRow>
  );
}

function ConnectorsList() {
  const { connectors, isInitialLoad, error } = useConnectors();

  if (isInitialLoad) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">Failed to load integrations.</p>;
  }

  return (
    <SettingsGroup>
      {(connectors ?? []).map((connector) => (
        <ConnectorRow connector={connector} key={connector.id} />
      ))}
    </SettingsGroup>
  );
}

function SlackLinkCard() {
  const {
    isLinked,
    pendingCode,
    generating,
    generateLinkCode,
    unlinkSlack,
    generateError,
  } = useSlackLink();

  return (
    <SettingsGroup>
      <SettingsRow
        description={
          isLinked
            ? "Your Slack account is linked. Search uses the Slack search connector above once authorized."
            : "Link your Slack account to chat with Agent C in Slack (separate from Slack search OAuth)."
        }
        leading={getToolCategoryIcon("slack", {
          size: 18,
          showBackground: false,
        })}
        title="Slack account"
      >
        <div className="flex flex-col items-end gap-2">
          {pendingCode ? (
            <p className="text-right text-xs">
              Send <code>link {pendingCode}</code> in a DM to the Agent C Slack bot
              (often shown as “Slack Connector”) to finish linking.
            </p>
          ) : null}
          {generateError ? (
            <p className="text-right text-xs text-destructive">{generateError.message}</p>
          ) : null}
          {isLinked ? (
            <Button size="sm" variant="outline" onClick={() => void unlinkSlack()}>
              Unlink
            </Button>
          ) : (
            <Button disabled={generating} size="sm" onClick={() => void generateLinkCode()}>
              {generating ? "Generating…" : "Generate link code"}
            </Button>
          )}
        </div>
      </SettingsRow>
    </SettingsGroup>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ConnectorsList />
      </Suspense>
      <SlackLinkCard />
    </div>
  );
}
