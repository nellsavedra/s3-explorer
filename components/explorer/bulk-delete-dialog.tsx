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
import { bulkDelete } from "@/lib/api";

interface BulkDeleteDialogProps {
  keys: string[];
  onClose: () => void;
  /** Called after a successful delete (clears the selection). */
  onDeleted: () => void;
}

export function BulkDeleteDialog({
  keys,
  onClose,
  onDeleted,
}: BulkDeleteDialogProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => bulkDelete(keys),
    onSuccess: (result) => {
      if (result.failed > 0) {
        toast.warning(
          `${result.deleted} deleted, ${result.failed} failed`,
        );
      } else {
        toast.success(
          result.deleted === 1 ? "File deleted" : `${result.deleted} files deleted`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["objects"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      onDeleted();
      onClose();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Delete failed"),
  });

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {keys.length} files</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the {keys.length} selected file
            {keys.length > 1 ? "s" : ""}. This action cannot be undone and
            requires the bucket IAM policy to allow deletions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
