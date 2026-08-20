"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteObject, type ObjectItem } from "@/lib/api";

interface DeleteDialogProps {
  item: ObjectItem | null;
  onClose: () => void;
}

export function DeleteDialog({ item, onClose }: DeleteDialogProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (key: string) => deleteObject(key),
    onSuccess: () => {
      toast.success(
        item?.type === "folder" ? "Folder deleted" : "File deleted",
      );
      queryClient.invalidateQueries({ queryKey: ["objects"] });
      onClose();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Delete failed"),
  });

  const isFolder = item?.type === "folder";

  return (
    <AlertDialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {isFolder ? "folder" : "file"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isFolder ? (
              <>
                This will permanently delete the folder{" "}
                <strong>{item?.name}</strong> and everything inside it.
              </>
            ) : (
              <>
                This will permanently delete <strong>{item?.name}</strong>.
              </>
            )}{" "}
            This action cannot be undone and requires the bucket IAM policy to
            allow deletions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => item && mutation.mutate(item.key)}
          >
            {mutation.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
