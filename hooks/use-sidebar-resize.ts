"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "sidebar-width";
const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

function clampWidth(width: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

function readStoredWidth() {
  if (typeof window === "undefined") {
    return DEFAULT_WIDTH;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return DEFAULT_WIDTH;
  }

  const parsed = Number.parseInt(stored, 10);
  return Number.isNaN(parsed) ? DEFAULT_WIDTH : clampWidth(parsed);
}

export function useSidebarResize() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const widthRef = useRef(width);

  useEffect(() => {
    setWidth(readStoredWidth());
  }, []);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const startResize = useCallback((event: React.MouseEvent) => {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = widthRef.current;

    function onMouseMove(moveEvent: MouseEvent) {
      const nextWidth = clampWidth(startWidth + moveEvent.clientX - startX);
      widthRef.current = nextWidth;
      setWidth(nextWidth);
    }

    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.localStorage.setItem(STORAGE_KEY, String(widthRef.current));
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  return { width, startResize, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH };
}
