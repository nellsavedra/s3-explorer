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
import { renameObject, type ObjectItem } from "@/lib/api";

interface RenameDialogProps {
  item: ObjectItem | null;
  onClose: () => void;
}

export function RenameDialog({ item, onClose }: RenameDialogProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ source, newName }: { source: string; newName: string }) =>
      renameObject(source, newName),
    onSuccess: () => {
      toast.success("File renamed");
      queryClient.invalidateQueries({ queryKey: ["objects"] });
      onClose();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Rename failed"),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item) return;
    const value = new FormData(event.currentTarget).get("name");
    const newName = typeof value === "string" ? value.trim() : "";
    if (!newName) {
      toast.error("Name cannot be empty");
      return;
    }
    if (newName.includes("/") || newName.includes("\\")) {
      toast.error("Name cannot contain slashes");
      return;
    }
    mutation.mutate({ source: item.key, newName });
  };

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>
              Enter a new name for &ldquo;{item?.name}&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-name">Name</Label>
            <Input
              key={item?.key}
              id="rename-name"
              name="name"
              defaultValue={item?.name}
              autoFocus
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Renaming…" : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
