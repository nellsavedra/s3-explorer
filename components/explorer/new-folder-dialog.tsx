"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFolder } from "@/lib/api";

interface NewFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefix: string;
}

export function NewFolderDialog({
  open,
  onOpenChange,
  prefix,
}: NewFolderDialogProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createFolder,
    onSuccess: () => {
      toast.success("Folder created");
      queryClient.invalidateQueries({ queryKey: ["objects"] });
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to create folder",
      ),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("name");
    const name = typeof value === "string" ? value.trim() : "";
    if (!name) {
      toast.error("Name cannot be empty");
      return;
    }
    if (name.includes("/") || name.includes("\\")) {
      toast.error("Name cannot contain slashes");
      return;
    }
    mutation.mutate(`${prefix}${name}/`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              The folder is created inside the current folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              name="name"
              autoFocus
              className="mt-1.5"
              placeholder="my-folder"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
