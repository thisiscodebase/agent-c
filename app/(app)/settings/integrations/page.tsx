"use client";

import type { ConnectorSummary } from "#shared/types/connector";
import { Suspense } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex min-w-0 items-center gap-2">
            {getToolCategoryIcon(connector.id, {
              size: 18,
              showBackground: false,
            })}
            <span className="truncate">{connector.name}</span>
          </CardTitle>
          <Badge variant={c.status.variant}>{c.status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{connector.description}</p>
        {c.hintLines.length > 0
          ? (
            <div className="text-xs text-muted-foreground">
              {c.hintLines.map((line) => <p key={line}>{line}</p>)}
            </div>
          )
          : null}
        {c.errorStatus
          ? <p className="text-sm text-destructive">{c.errorStatus.message}</p>
          : null}
        {c.actionError
          ? <p className="text-sm text-destructive">{c.actionError}</p>
          : null}
        {c.showTestResults && c.testResults
          ? (
            <div className="text-sm">
              <p className="font-medium">{c.resultsHeading}</p>
              <ul className="list-inside list-disc">
                {c.parsedResults.map((result) => (
                  <li key={result.id ?? result.tag ?? result.title}>
                    {result.title}
                  </li>
                ))}
              </ul>
            </div>
          )
          : null}
      </CardContent>
      <CardFooter className="gap-2">
        {c.canConnect
          ? (
            <Button disabled={c.connecting} onClick={() => void c.connect()}>
              {c.connecting ? "Connecting…" : "Connect"}
            </Button>
          )
          : null}
        {c.isConnected
          ? (
            <Button
              disabled={c.testing}
              variant="outline"
              onClick={() => void c.test()}
            >
              {c.testing ? "Testing…" : connector.testLabel}
            </Button>
          )
          : null}
        {c.isConnected && c.canRevoke
          ? (
            <Dialog
              open={c.showRevokeModal}
              onOpenChange={c.setShowRevokeModal}
            >
              <DialogTrigger render={<Button variant="ghost">Revoke</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Revoke {connector.name}?</DialogTitle>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose
                    render={<Button variant="outline">Cancel</Button>}
                  />
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
          )
          : null}
      </CardFooter>
    </Card>
  );
}

function ConnectorsList() {
  const { connectors, isInitialLoad, error } = useConnectors();

  if (isInitialLoad) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">Failed to load integrations.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {(connectors ?? []).map((connector) => (
        <ConnectorRow connector={connector} key={connector.id} />
      ))}
    </div>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getToolCategoryIcon("slack", { size: 18, showBackground: false })}
          <span>Slack account</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isLinked
          ? (
            <p className="text-sm text-muted-foreground">
              Your Slack account is linked. Search uses the Slack search
              connector above once authorized.
            </p>
          )
          : (
            <p className="text-sm text-muted-foreground">
              Link your Slack account to chat with 🍊 Agent C in Slack (separate
              from Slack search OAuth).
            </p>
          )}
        {pendingCode
          ? (
            <p className="text-sm">
              Send <code>{pendingCode}</code> to @V in Slack to finish linking.
            </p>
          )
          : null}
        {generateError
          ? <p className="text-sm text-destructive">{generateError.message}</p>
          : null}
      </CardContent>
      <CardFooter>
        {isLinked
          ? (
            <Button variant="outline" onClick={() => void unlinkSlack()}>
              Unlink
            </Button>
          )
          : (
            <Button
              disabled={generating}
              onClick={() => void generateLinkCode()}
            >
              {generating ? "Generating…" : "Generate link code"}
            </Button>
          )}
      </CardFooter>
    </Card>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
      >
        <ConnectorsList />
      </Suspense>
      <SlackLinkCard />
    </div>
  );
}
