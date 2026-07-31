"use client";

import { AlertTriangleIcon } from "lucide-react";
import { ArtifactView } from "~/components/artifacts/artifact-view";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "~/components/ui/sheet";
import { Spinner } from "~/components/ui/spinner";
import { useArtifact } from "~/hooks/use-artifact";
import { useMediaQuery } from "~/hooks/use-media-query";
import { usePanelResize } from "~/hooks/use-panel-resize";

const DESKTOP_QUERY = "(min-width: 768px)";

function PanelPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function PanelBody({
  artifactId,
  onClose,
  showFullPageLink,
}: {
  artifactId: string;
  onClose: () => void;
  showFullPageLink?: boolean;
}) {
  const { artifact, isLoading, error } = useArtifact(artifactId);

  if (isLoading) {
    return (
      <PanelPlaceholder>
        <Spinner className="size-4" />
        Loading artifact…
      </PanelPlaceholder>
    );
  }

  if (error || !artifact) {
    return (
      <PanelPlaceholder>
        <AlertTriangleIcon className="size-4" />
        {error instanceof Error ? error.message : "Artifact not found"}
      </PanelPlaceholder>
    );
  }

  return (
    <ArtifactView
      artifact={artifact}
      onClose={onClose}
      showFullPageLink={showFullPageLink}
    />
  );
}

/**
 * Docked beside the conversation on desktop, an overlay sheet on mobile.
 */
export function ArtifactSidePanel({
  artifactId,
  onClose,
}: {
  artifactId: string;
  onClose: () => void;
}) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const { width, startResize, onKeyDown, minWidth, maxWidth } = usePanelResize({
    storageKey: "artifact-panel-width",
    defaultWidth: 420,
    minWidth: 320,
    maxWidth: 720,
    edge: "right",
  });

  if (!isDesktop) {
    return (
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-[min(32rem,92vw)] gap-0 p-0 sm:max-w-lg" side="right">
          <SheetTitle className="sr-only">Artifact</SheetTitle>
          <SheetDescription className="sr-only">
            Read the saved document alongside this conversation.
          </SheetDescription>
          <PanelBody artifactId={artifactId} onClose={onClose} showFullPageLink />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className="relative hidden shrink-0 flex-col border-l border-border/60 bg-background md:flex"
      style={{ width }}
    >
      <div
        aria-label="Resize artifact panel"
        aria-orientation="vertical"
        aria-valuemax={maxWidth}
        aria-valuemin={minWidth}
        aria-valuenow={width}
        className="absolute top-0 left-0 z-10 h-full w-1 -translate-x-1/2 cursor-col-resize touch-none hover:bg-border/60 active:bg-border"
        onKeyDown={onKeyDown}
        onMouseDown={startResize}
        role="separator"
        tabIndex={0}
      />

      <PanelBody artifactId={artifactId} onClose={onClose} showFullPageLink />
    </aside>
  );
}
