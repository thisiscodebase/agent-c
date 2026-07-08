"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MemoryByCategory, MemoryEntry } from "#shared/types/memory";
import { MEMORY_EXPORT_PROMPT } from "#shared/memory/export-prompt";
import { queryKeys } from "~/lib/query-keys";

interface MemoryResponse {
  memory: MemoryByCategory;
}

interface ImportMemoryResponse {
  created: MemoryEntry[];
  skipped: string[];
  memory: MemoryByCategory;
}

interface UpdateMemoryResponse {
  entry: MemoryEntry;
}

export function useMemory() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.memory,
    queryFn: () => fetch("/api/memory").then((r) => r.json() as Promise<MemoryResponse>),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.memory });

  const importMutation = useMutation({
    mutationFn: async (raw: string) => {
      const res = await fetch("/api/memory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      if (!res.ok) throw new Error("Failed to import memory");
      return res.json() as Promise<ImportMemoryResponse>;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/memory/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete memory entry");
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await fetch(`/api/memory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to update memory entry");
      return res.json() as Promise<UpdateMemoryResponse>;
    },
    onSuccess: invalidate,
  });

  async function copyExportPrompt() {
    await navigator.clipboard.writeText(MEMORY_EXPORT_PROMPT);
  }

  return {
    memory: query.data?.memory,
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
    importMemory: (raw: string) => importMutation.mutateAsync(raw),
    deleteEntry: (id: string) => deleteMutation.mutateAsync(id),
    updateEntry: (id: string, content: string) => updateMutation.mutateAsync({ id, content }),
    copyExportPrompt,
    exportPrompt: MEMORY_EXPORT_PROMPT,
  };
}

export function formatMemoryDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}
