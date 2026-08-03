"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  listRecentArtifactIds,
  recordArtifactOpen,
} from "~/lib/artifact-recents";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return listRecentArtifactIds().join("\0");
}

function getServerSnapshot() {
  return "";
}

/** Live list of recently opened artifact ids (newest first). */
export function useRecentArtifactIds() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return snapshot ? snapshot.split("\0") : [];
}

/** Call once when an artifact view mounts to bump it in Recents. */
export function useRecordArtifactOpen(artifactId: string) {
  useEffect(() => {
    if (!artifactId) {
      return;
    }

    recordArtifactOpen(artifactId);
    emit();
  }, [artifactId]);
}

export function useRecordArtifactOpenHandler() {
  return useCallback((id: string) => {
    recordArtifactOpen(id);
    emit();
  }, []);
}
