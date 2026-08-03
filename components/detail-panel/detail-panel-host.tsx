"use client";

import { Suspense } from "react";
import { DetailSidePanel } from "~/components/detail-panel/detail-side-panel";
import { useDetailPanel } from "~/hooks/use-detail-panel";

function DetailPanelHostInner({ children }: { children: React.ReactNode }) {
  const { panel, closePanel } = useDetailPanel();

  return (
    <div className="flex h-full min-w-0">
      <div className="relative min-w-0 flex-1">{children}</div>
      {panel ? <DetailSidePanel onClose={closePanel} panel={panel} /> : null}
    </div>
  );
}

/**
 * Flex host that docks the detail panel to the right of chat / home content.
 */
export function DetailPanelHost({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-w-0">
          <div className="relative min-w-0 flex-1">{children}</div>
        </div>
      }
    >
      <DetailPanelHostInner>{children}</DetailPanelHostInner>
    </Suspense>
  );
}
