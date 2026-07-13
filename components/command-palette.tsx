"use client";

import { PlusIcon, SettingsIcon, MessageSquareIcon, PlugIcon, UserIcon, PodiumIcon, ShieldIcon } from "lucide-react";
import { useMemo } from "react";
import { profilePathForEmail } from "#shared/user-handle";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "~/components/ui/command";
import { useChatNavigation } from "~/hooks/chat/use-chat-navigation";
import { useThreadList } from "~/hooks/chat/use-threads";
import { useAdminAccess } from "~/hooks/use-admin";
import { authClient } from "~/lib/auth-client";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { threads } = useThreadList();
  const { navigate } = useChatNavigation();
  const { data: session } = authClient.useSession();
  const { data: adminAccess } = useAdminAccess();
  const profileHref = useMemo(
    () => profilePathForEmail(session?.user?.email) ?? "/settings",
    [session?.user?.email],
  );

  function go(to: string) {
    onOpenChange(false);
    navigate(to);
  }

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open}>
      <Command>
        <CommandInput placeholder="Type a command or search chats…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => go("/")}>
              <PlusIcon />
              New chat
            </CommandItem>
            <CommandItem onSelect={() => go(profileHref)}>
              <UserIcon />
              Profile
            </CommandItem>
            <CommandItem onSelect={() => go("/leaderboard")}>
              <PodiumIcon />
              Leaderboard
            </CommandItem>
            {adminAccess?.allowed ? (
              <CommandItem onSelect={() => go("/admin")}>
                <ShieldIcon />
                Admin dashboard
              </CommandItem>
            ) : null}
            <CommandItem onSelect={() => go("/settings")}>
              <SettingsIcon />
              Settings
            </CommandItem>
            <CommandItem onSelect={() => go("/settings/integrations")}>
              <PlugIcon />
              Integrations
            </CommandItem>
          </CommandGroup>
          {threads.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Chats">
                {threads.map((thread) => (
                  <CommandItem key={thread.id} value={thread.title} onSelect={() => go(`/chat/${thread.id}`)}>
                    <MessageSquareIcon />
                    {thread.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
        <div className="flex items-center justify-end border-t px-3 py-2">
          <CommandShortcut>⌘K</CommandShortcut>
        </div>
      </Command>
    </CommandDialog>
  );
}
