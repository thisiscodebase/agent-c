"use client";

import Link from "next/link";
import type { AdminRecentThread } from "#shared/types/usage-stats";
import { isSlackThreadId } from "#shared/types/thread";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { formatCostUsd } from "~/lib/format-usage";
import { cn } from "~/lib/utils";

function userInitial(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

function formatUpdated(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isSlackThread(thread: AdminRecentThread): boolean {
  return thread.source === "slack" || isSlackThreadId(thread.threadId);
}

export function AdminRecentThreads({ threads }: { threads: AdminRecentThread[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium">Recent threads</h2>
        <p className="text-xs text-muted-foreground">
          Latest across the team · open a web chat, or a Slack row to see that member
        </p>
      </div>
      {threads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No threads yet.</p>
      ) : (
        <ul
          className={cn(
            "w-full min-w-0 divide-y divide-foreground/10 rounded-xl bg-card ring-1 ring-foreground/10",
            threads.length > 8 ? "max-h-96 overflow-y-auto" : "overflow-hidden",
          )}
        >
          {threads.map((thread) => {
            const slack = isSlackThread(thread);
            const href = slack
              ? `/admin/users/${encodeURIComponent(thread.userHandle)}`
              : `/chat/${thread.threadId}`;
            return (
              <li key={thread.threadId}>
                <Link
                  className="flex w-full min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  href={href}
                >
                  <Avatar size="sm">
                    <AvatarImage alt="" src={thread.userImage ?? undefined} />
                    <AvatarFallback>{userInitial(thread.userName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                      <span className="truncate">{thread.title}</span>
                      {slack ? (
                        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Slack
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {thread.userName} · {formatUpdated(thread.updatedAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {formatCostUsd(thread.totalCostUsd)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
