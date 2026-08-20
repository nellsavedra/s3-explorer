"use client";

import { useQuery } from "@tanstack/react-query";
import { File, Folder, FolderOpen } from "lucide-react";

import { ObjectActionsMenu } from "@/components/explorer/object-actions-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  hasFileExtension,
  isImageFile,
  previewUrl,
  sniffObject,
  type ObjectItem,
} from "@/lib/api";

interface ObjectsGalleryProps {
  items: ObjectItem[] | undefined;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onOpenFolder: (item: ObjectItem) => void;
  onPreview: (item: ObjectItem) => void;
  onRename: (item: ObjectItem) => void;
  onDelete: (item: ObjectItem) => void;
}

interface GalleryCardProps {
  item: ObjectItem;
  onOpenFolder: (item: ObjectItem) => void;
  onPreview: (item: ObjectItem) => void;
  onRename: (item: ObjectItem) => void;
  onDelete: (item: ObjectItem) => void;
}

function GalleryCard({
  item,
  onOpenFolder,
  onPreview,
  onRename,
  onDelete,
}: GalleryCardProps) {
  const isImageByExtension = item.type === "file" && isImageFile(item.name);

  // Files with no extension might still be images: sniff their magic bytes.
  const needsSniff =
    item.type === "file" &&
    !isImageByExtension &&
    !hasFileExtension(item.name) &&
    item.size > 0;
  const sniffQuery = useQuery({
    queryKey: ["sniff", item.key],
    queryFn: () => sniffObject(item.key),
    enabled: needsSniff,
    staleTime: 5 * 60 * 1000,
  });

  const isImage = isImageByExtension || sniffQuery.data?.image === true;
  const clickable = item.type === "folder" || isImage;

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        disabled={!clickable}
        onClick={() =>
          item.type === "folder" ? onOpenFolder(item) : onPreview(item)
        }
        className="block w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
        aria-label={
          item.type === "folder"
            ? `Open folder ${item.name}`
            : `Preview ${item.name}`
        }
      >
        <div className="aspect-square w-full overflow-hidden bg-muted/40">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- proxied S3 object URL
            <img
              src={previewUrl(item.key)}
              alt={item.name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              {item.type === "folder" ? (
                <Folder className="size-12 text-primary/70" />
              ) : (
                <File className="size-12 text-muted-foreground/40" />
              )}
            </div>
          )}
        </div>
        <div className="border-t px-2.5 py-2">
          <p className="truncate text-left text-xs font-medium">{item.name}</p>
        </div>
      </button>
      <ObjectActionsMenu
        item={item}
        onRename={onRename}
        onDelete={onDelete}
        className="absolute right-1.5 top-1.5 bg-background/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
      />
    </div>
  );
}

export function ObjectsGallery({
  items,
  loading,
  error,
  onRetry,
  onOpenFolder,
  onPreview,
  onRename,
  onDelete,
}: ObjectsGalleryProps) {
  const sorted = items ?? [];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card py-14">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load objects"}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card py-14 text-center">
        <FolderOpen className="size-8 text-muted-foreground/40" />
        <p className="text-sm font-medium">This folder is empty</p>
        <p className="text-xs text-muted-foreground">
          Upload files or create a folder to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {sorted.map((item) => (
        <GalleryCard
          key={item.key}
          item={item}
          onOpenFolder={onOpenFolder}
          onPreview={onPreview}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
