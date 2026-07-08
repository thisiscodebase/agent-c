"use client";

import { PlusIcon, SearchIcon, ToolCaseIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CommandPalette } from "~/components/command-palette";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useChatNavigation } from "~/hooks/chat/use-chat-navigation";
import { formatThreadTime, useThreadList } from "~/hooks/chat/use-threads";
import { useThreadGroups } from "~/hooks/chat/use-thread-groups";
import { useSidebarResize } from "~/hooks/use-sidebar-resize";
import { authClient } from "~/lib/auth-client";

type ShellUser = {
  name?: string | null;
  image?: string | null;
};

function userInitial(user: ShellUser | undefined) {
  return user?.name?.trim()?.[0]?.toUpperCase() ?? "?";
}

export function AppShell({
  children,
  user: serverUser,
}: {
  children: React.ReactNode;
  user: ShellUser;
}) {
  const params = useParams<{ id?: string }>();
  const activeChatId = typeof params.id === "string" ? params.id : undefined;

  const { threads } = useThreadList();
  const groups = useThreadGroups(threads);
  const { navigate, deleteThread } = useChatNavigation();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const { width: sidebarWidth, startResize, minWidth, maxWidth } = useSidebarResize();
  const { data: session } = authClient.useSession();
  const user = session?.user ?? serverUser;

  const startNewChat = useCallback(() => {
    navigate("/");
  }, [navigate]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      if (event.key === "k") {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }

      if (event.key === "n") {
        event.preventDefault();
        startNewChat();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [startNewChat]);

  return (
    <div className="flex h-dvh">
      <CommandPalette onOpenChange={setPaletteOpen} open={paletteOpen} />

      <aside
        className="relative flex shrink-0 flex-col border-r bg-muted/30"
        style={{ width: sidebarWidth }}
      >
        <div className="flex flex-col gap-1.5 p-3">
          <div className="flex gap-1.5">
            <Button className="flex-1 justify-between" variant="outline" onClick={startNewChat}>
              <span className="flex items-center gap-1.5">
                <PlusIcon className="size-4" />
                New
              </span>
              <kbd className="text-xs text-muted-foreground">⌘N</kbd>
            </Button>
            <Button className="flex-1 justify-start" type="button" variant="outline">
              <ToolCaseIcon className="size-4" />
              Files
            </Button>
          </div>
          <Button className="w-full justify-between" variant="ghost" onClick={() => setPaletteOpen(true)}>
            <span className="flex items-center gap-2">
              <SearchIcon className="size-4" />
              Search
            </span>
            <kbd className="text-xs text-muted-foreground">⌘K</kbd>
          </Button>
        </div>

        <ScrollArea className="min-w-0 flex-1 px-3">
          <nav className="flex min-w-0 flex-col gap-4 pb-3">
            {groups.map((group) => (
              <div key={group.id}>
                <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{group.label}</p>
                <div className="flex min-w-0 flex-col gap-0.5">
                  {group.items.map((thread) => (
                    <div key={thread.id} className="group relative flex min-w-0 items-center">
                      <Link
                        className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 pr-2 text-sm group-hover:pr-8 hover:bg-accent"
                        data-active={thread.id === activeChatId}
                        href={`/chat/${thread.id}`}
                      >
                        <span className="min-w-0 truncate">{thread.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground group-hover:hidden">
                          {formatThreadTime(thread.updatedAt)}
                        </span>
                      </Link>
                      <Button
                        className="absolute right-0 hidden shrink-0 group-hover:inline-flex"
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

        <div className="p-3">
          <Button
            className="w-full justify-start gap-2"
            nativeButton={false}
            render={<Link href="/settings/profile" />}
            variant="ghost"
          >
            <Avatar size="sm">
              <AvatarImage alt={user?.name ?? "Account"} src={user?.image ?? undefined} />
              <AvatarFallback>{userInitial(user)}</AvatarFallback>
            </Avatar>
            Settings
          </Button>
        </div>

        <div
          aria-orientation="vertical"
          aria-valuemax={maxWidth}
          aria-valuemin={minWidth}
          aria-valuenow={sidebarWidth}
          className="absolute top-0 right-0 z-10 h-full w-1 translate-x-1/2 cursor-col-resize touch-none hover:bg-border/60 active:bg-border"
          onMouseDown={startResize}
          role="separator"
        />
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
