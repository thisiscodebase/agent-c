"use client";

import { PlusIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useChatNavigation } from "~/hooks/chat/use-chat-navigation";
import { formatThreadTime, useThreadList } from "~/hooks/chat/use-threads";
import { useThreadGroups } from "~/hooks/chat/use-thread-groups";

export function AppShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id?: string }>();
  const activeChatId = typeof params.id === "string" ? params.id : undefined;

  const { threads } = useThreadList();
  const groups = useThreadGroups(threads);
  const { navigate, deleteThread } = useChatNavigation();

  return (
    <div className="flex h-dvh">
      <aside className="flex w-64 shrink-0 flex-col border-r bg-muted/30">
        <div className="p-3">
          <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/")}>
            <PlusIcon className="size-4" />
            New chat
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3">
          <nav className="flex flex-col gap-4 pb-3">
            {groups.map((group) => (
              <div key={group.id}>
                <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{group.label}</p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((thread) => (
                    <div key={thread.id} className="group flex items-center gap-1">
                      <Link
                        className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                        data-active={thread.id === activeChatId}
                        href={`/chat/${thread.id}`}
                      >
                        {thread.title}
                        <span className="ml-2 text-xs text-muted-foreground">{formatThreadTime(thread.updatedAt)}</span>
                      </Link>
                      <Button
                        className="hidden shrink-0 group-hover:inline-flex"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => void deleteThread(thread.id, activeChatId)}
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        <div className="border-t p-3">
          <Button asChild className="w-full justify-start" variant="ghost">
            <Link href="/settings/profile">
              <SettingsIcon className="size-4" />
              Settings
            </Link>
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
