"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const KEYBOARD_STEP = 8;

export interface PanelResizeOptions {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  /**
   * Which edge the panel is anchored to. A left-anchored panel grows when the
   * handle moves right; a right-anchored one grows when it moves left.
   */
  edge?: "left" | "right";
}

/** Drag-and-keyboard width control for a docked side panel. */
export function usePanelResize({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  edge = "left",
}: PanelResizeOptions) {
  const [width, setWidth] = useState(defaultWidth);
  const widthRef = useRef(width);

  const clampWidth = useCallback(
    (value: number) => Math.min(maxWidth, Math.max(minWidth, value)),
    [maxWidth, minWidth],
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return;
    }

    const parsed = Number.parseInt(stored, 10);
    if (!Number.isNaN(parsed)) {
      setWidth(clampWidth(parsed));
    }
  }, [clampWidth, storageKey]);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const persistWidth = useCallback(
    (value: number) => window.localStorage.setItem(storageKey, String(value)),
    [storageKey],
  );

  const startResize = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();

      const startX = event.clientX;
      const startWidth = widthRef.current;
      const sign = edge === "left" ? 1 : -1;

      function onMouseMove(moveEvent: MouseEvent) {
        const nextWidth = clampWidth(startWidth + sign * (moveEvent.clientX - startX));
        widthRef.current = nextWidth;
        setWidth(nextWidth);
      }

      function onMouseUp() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        persistWidth(widthRef.current);
      }

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [clampWidth, edge, persistWidth],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      const sign = edge === "left" ? 1 : -1;
      const delta = (event.key === "ArrowRight" ? KEYBOARD_STEP : -KEYBOARD_STEP) * sign;
      const nextWidth = clampWidth(widthRef.current + delta);
      widthRef.current = nextWidth;
      setWidth(nextWidth);
      persistWidth(nextWidth);
    },
    [clampWidth, edge, persistWidth],
  );

  return { width, startResize, onKeyDown, minWidth, maxWidth };
}
