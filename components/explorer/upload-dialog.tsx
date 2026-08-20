"use client";

import { useQueryClient } from "@tanstack/react-query";
import { File, X } from "lucide-react";
import { useRef, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { uploadFile } from "@/lib/api";
import { formatBytes } from "@/lib/format";

interface PendingFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefix: string;
}

export function UploadDialog({ open, onOpenChange, prefix }: UploadDialogProps) {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const updateFile = (id: string, patch: Partial<PendingFile>) =>
    setFiles((current) =>
      current.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next: PendingFile[] = Array.from(list).map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: "pending",
    }));
    setFiles((current) => [...current, ...next]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const reset = () => {
    setFiles([]);
    setUploading(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (uploading) return; // uploads in progress: keep the dialog open
    if (!next) reset();
    onOpenChange(next);
  };

  const handleUpload = async () => {
    setUploading(true);
    let succeeded = 0;
    let failed = 0;
    for (const item of files) {
      if (item.status === "done") {
        succeeded++;
        continue;
      }
      updateFile(item.id, { status: "uploading", error: undefined });
      try {
        await uploadFile(prefix + item.file.name, item.file, (progress) =>
          updateFile(item.id, { progress }),
        );
        updateFile(item.id, { status: "done", progress: 100 });
        succeeded++;
      } catch (error) {
        updateFile(item.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed",
        });
        failed++;
      }
    }
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["objects"] });
    if (failed === 0) {
      toast.success(succeeded === 1 ? "File uploaded" : `${succeeded} files uploaded`);
      reset();
      onOpenChange(false);
    } else {
      toast.error(`${failed} of ${succeeded + failed} uploads failed`);
    }
  };

  const pendingCount = files.filter((f) => f.status !== "done").length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload files</DialogTitle>
          <DialogDescription>
            Files are uploaded to the current folder. Existing files with the
            same name are overwritten.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />

        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <File className="mb-1 size-6" />
          <span className="font-medium">Click to select files</span>
          <span className="text-xs">You can select multiple files</span>
        </button>

        {files.length > 0 && (
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {files.map((item) => (
              <li key={item.id} className="rounded-md border p-2.5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {item.file.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatBytes(item.file.size)}
                  </span>
                  {!uploading && item.status !== "done" && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((f) => f.id !== item.id),
                        )
                      }
                    >
                      <X />
                    </Button>
                  )}
                </div>
                {(item.status === "uploading" || item.status === "done") && (
                  <Progress value={item.progress} className="mt-2" />
                )}
                {item.status === "error" && (
                  <p className="mt-1.5 text-xs text-destructive">{item.error}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || pendingCount === 0}
          >
            {uploading
              ? "Uploading…"
              : pendingCount === 1
                ? "Upload 1 file"
                : `Upload ${pendingCount} files`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
