"use client";

import { usePanelResize } from "~/hooks/use-panel-resize";

export function useSidebarResize() {
  return usePanelResize({
    storageKey: "sidebar-width",
    defaultWidth: 256,
    minWidth: 200,
    maxWidth: 480,
    edge: "left",
  });
}
