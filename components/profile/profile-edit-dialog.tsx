"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useProfile } from "~/hooks/use-profile";
import { queryKeys } from "~/lib/query-keys";

export function ProfileEditDialog({
  open,
  onOpenChange,
  handle,
  initialName,
  initialBio,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handle: string;
  initialName: string;
  initialBio: string;
}) {
  const queryClient = useQueryClient();
  const { saveProfile, isSaving, saveError } = useProfile();
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setBio(initialBio);
    }
  }, [open, initialName, initialBio]);

  async function onSave() {
    await saveProfile({ name: name.trim(), bio });
    await queryClient.invalidateQueries({ queryKey: queryKeys.publicProfile(handle) });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="edit-name">
              Display name
            </label>
            <Input
              id="edit-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="edit-handle">
              Handle
            </label>
            <Input disabled id="edit-handle" value={`@${handle}`} />
            <p className="text-xs text-muted-foreground">
              Derived from your email and cannot be changed.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="edit-bio">
              Personal context
            </label>
            <Textarea
              id="edit-bio"
              rows={4}
              value={bio}
              placeholder="A short public bio or personal context…"
              onChange={(event) => setBio(event.target.value)}
            />
          </div>
          {saveError ? (
            <p className="text-sm text-destructive">Failed to save profile.</p>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Cancel</Button>} />
          <Button disabled={isSaving || !name.trim()} onClick={() => void onSave()}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
