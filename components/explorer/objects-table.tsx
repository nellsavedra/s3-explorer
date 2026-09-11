"use client";

import { File, Folder, FolderOpen } from "lucide-react";

import { ObjectActionsMenu } from "@/components/explorer/object-actions-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type ObjectItem } from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/format";

interface ObjectsTableProps {
  items: ObjectItem[] | undefined;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onOpenFolder: (item: ObjectItem) => void;
  onPreview: (item: ObjectItem) => void;
  onRename: (item: ObjectItem) => void;
  onDelete: (item: ObjectItem) => void;
  selectedKeys: ReadonlySet<string>;
  onToggleSelect: (item: ObjectItem, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  /** Shows the folder path under the name (used for search results). */
  showFolder?: boolean;
}

export function ObjectsTable({
  items,
  loading,
  error,
  onRetry,
  onOpenFolder,
  onPreview,
  onRename,
  onDelete,
  selectedKeys,
  onToggleSelect,
  onToggleSelectAll,
  showFolder,
}: ObjectsTableProps) {
  const sorted = items ?? [];
  const files = sorted.filter((item) => item.type === "file");
  const selectedCount = files.filter((f) => selectedKeys.has(f.key)).length;
  const allSelected = files.length > 0 && selectedCount === files.length;
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 pl-3">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={(checked) => onToggleSelectAll(checked)}
                aria-label="Select all files"
              />
            </TableHead>
            <TableHead className="w-full text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Name
            </TableHead>
            <TableHead className="w-28 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Size
            </TableHead>
            <TableHead className="w-48 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Last modified
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="pl-3" />
                <TableCell>
                  <Skeleton className="h-4 w-56" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-14" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell />
              </TableRow>
            ))}

          {!loading && error && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center">
                <p className="text-sm text-destructive">
                  {error instanceof Error
                    ? error.message
                    : "Failed to load objects"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={onRetry}
                >
                  Retry
                </Button>
              </TableCell>
            </TableRow>
          )}

          {!loading && !error && sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-14">
                <div className="flex flex-col items-center gap-2 text-center">
                  <FolderOpen className="size-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium">This folder is empty</p>
                  <p className="text-xs text-muted-foreground">
                    Upload files or create a folder to get started
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            !error &&
            sorted.map((item) => (
              <TableRow
                key={item.key}
                onClick={() =>
                  item.type === "folder" ? onOpenFolder(item) : onPreview(item)
                }
                data-selected={selectedKeys.has(item.key) || undefined}
                className="cursor-pointer data-selected:bg-primary/5"
              >
                <TableCell
                  className="pl-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  {item.type === "file" && (
                    <Checkbox
                      checked={selectedKeys.has(item.key)}
                      onCheckedChange={(checked) => onToggleSelect(item, checked)}
                      aria-label={`Select ${item.name}`}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <span className="inline-flex max-w-full items-center gap-2">
                    {item.type === "folder" ? (
                      <Folder className="size-4 shrink-0 text-primary" />
                    ) : (
                      <File className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {item.name}
                      </span>
                      {showFolder && item.folder && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.folder}
                        </span>
                      )}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.type === "folder" ? "—" : formatBytes(item.size)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(item.lastModified)}
                </TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <ObjectActionsMenu
                    item={item}
                    onRename={onRename}
                    onDelete={onDelete}
                  />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
