"use client";

import { AlertTriangleIcon, CopyIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { buildChatErrorReport, formatChatErrorMessage } from "~/lib/chat-error-report";
import { chatInputColumnClass } from "./chat-layout";

export function ChatErrorBanner({
  error,
  threadId,
}: {
  error: Error | undefined;
  threadId: string;
}) {
  const [dismissedError, setDismissedError] = useState<Error | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  if (!error || error === dismissedError) return null;

  async function copyDetails() {
    if (!error) return;
    try {
      await navigator.clipboard.writeText(buildChatErrorReport(error, threadId));
      setCopied(true);
      toast.success("Error details copied", { duration: 2500 });
      window.setTimeout(() => setCopied(false), 2000);
    }
    catch {
      toast.error("Could not copy to clipboard", { duration: 4000 });
    }
  }

  return (
    <div className="pb-2">
      <div className={chatInputColumnClass}>
        <Alert variant="destructive" className="has-data-[slot=alert-action]:pr-36">
          <AlertTriangleIcon />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{formatChatErrorMessage(error)}</AlertDescription>
          <AlertAction>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => void copyDetails()}>
                <CopyIcon />
                {copied ? "Copied" : "Copy details"}
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setDismissedError(error)}>
                <XIcon />
              </Button>
            </div>
          </AlertAction>
        </Alert>
      </div>
    </div>
  );
}
