"use client";

import type { LinkSafetyModalProps } from "streamdown";
import { CheckIcon, CopyIcon, ExternalLinkIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/**
 * Streamdown's default link-safety modal renders inline next to the link.
 * Inside markdown paragraphs that produces invalid `<p><div>` nesting and
 * hydration errors. Portaling to `document.body` keeps the modal out of `<p>`.
 */
export function StreamdownLinkSafetyModal({
  url,
  isOpen,
  onClose,
  onConfirm,
}: LinkSafetyModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
    catch {
      // Clipboard may be unavailable; ignore.
    }
  }, [url]);

  const openLink = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  if (!mounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"
      data-streamdown="link-safety-modal"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        aria-labelledby="streamdown-link-safety-title"
        aria-modal="true"
        className="relative mx-4 flex w-full max-w-md flex-col gap-4 rounded-xl border bg-background p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <Button
          aria-label="Close"
          className="absolute top-4 right-4"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={onClose}
        >
          <XIcon className="size-4" />
        </Button>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-lg font-semibold" id="streamdown-link-safety-title">
            <ExternalLinkIcon className="size-5" />
            <span>Open external link?</span>
          </div>
          <p className="text-sm text-muted-foreground">
            You are about to leave this app and open an external website.
          </p>
        </div>

        <div
          className={cn(
            "break-all rounded-md bg-muted p-3 font-mono text-sm",
            url.length > 100 && "max-h-32 overflow-y-auto",
          )}
        >
          {url}
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" type="button" variant="outline" onClick={() => void copyUrl()}>
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button className="flex-1" type="button" onClick={openLink}>
            Open link
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export const streamdownLinkSafety = {
  enabled: true,
  renderModal: (props: LinkSafetyModalProps) => <StreamdownLinkSafetyModal {...props} />,
} as const;
