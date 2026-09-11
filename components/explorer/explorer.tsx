"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Download, X } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { DeleteDialog } from "@/components/explorer/delete-dialog";
import { PreviewDialog } from "@/components/explorer/preview-dialog";
import { NewFolderDialog } from "@/components/explorer/new-folder-dialog";
import { ObjectsGallery } from "@/components/explorer/objects-gallery";
import { ObjectsTable } from "@/components/explorer/objects-table";
import { PrefixBreadcrumbs } from "@/components/explorer/prefix-breadcrumbs";
import { RenameDialog } from "@/components/explorer/rename-dialog";
import { SearchInput } from "@/components/explorer/search-input";
import { SiteHeader } from "@/components/explorer/site-header";
import { SortMenu } from "@/components/explorer/sort-menu";
import { UploadDialog } from "@/components/explorer/upload-dialog";
import { ViewToggle, type ViewMode } from "@/components/explorer/view-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfig } from "@/hooks/use-config";
import { downloadZip, fetchObjects, searchObjects, type ObjectItem } from "@/lib/api";
import { sortItems, SORT_MODES, type SortMode } from "@/lib/sort-items";

const VIEW_STORAGE_KEY = "s3-explorer-view";
const SORT_STORAGE_KEY = "s3-explorer-sort";

// Preferences are read from localStorage via useSyncExternalStore: the server
// snapshot is always null, so hydration matches and the stored preference is
// applied on the client right after mount.
function subscribeNoop() {
  return () => {};
}

function getStoredView(): ViewMode | null {
  const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
  return stored === "gallery" || stored === "list" ? stored : null;
}

function getStoredSort(): SortMode | null {
  const stored = window.localStorage.getItem(SORT_STORAGE_KEY);
  return SORT_MODES.some((m) => m.value === stored)
    ? (stored as SortMode)
    : null;
}

export function Explorer() {
  const configQuery = useConfig();
  const config = configQuery.data;

  // null = "not chosen yet", so the initial prefix follows the config root.
  const [prefixOverride, setPrefixOverride] = useState<string | null>(null);
  const prefix = prefixOverride ?? config?.rootPrefix ?? "";

  const [viewOverride, setViewOverride] = useState<ViewMode | null>(null);
  const storedView = useSyncExternalStore(
    subscribeNoop,
    getStoredView,
    () => null,
  );
  const view = viewOverride ?? storedView ?? "list";

  const changeView = (next: ViewMode) => {
    setViewOverride(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  };

  const [sortOverride, setSortOverride] = useState<SortMode | null>(null);
  const storedSort = useSyncExternalStore(
    subscribeNoop,
    getStoredSort,
    () => null,
  );
  const sortMode = sortOverride ?? storedSort ?? "name-asc";

  const changeSort = (next: SortMode) => {
    setSortOverride(next);
    window.localStorage.setItem(SORT_STORAGE_KEY, next);
  };

  const objectsQuery = useInfiniteQuery({
    queryKey: ["objects", prefix],
    queryFn: ({ pageParam }) => fetchObjects(prefix, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextContinuationToken,
    enabled: configQuery.isSuccess,
  });

  const sortedItems = useMemo(
    () =>
      sortItems(
        objectsQuery.data?.pages.flatMap((page) => page.items) ?? [],
        sortMode,
      ),
    [objectsQuery.data, sortMode],
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ObjectItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ObjectItem | null>(null);
  const [previewTarget, setPreviewTarget] = useState<ObjectItem | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const searchActive = debouncedQuery.length >= 2;
  const searchQuery = useQuery({
    queryKey: ["search", prefix, debouncedQuery],
    queryFn: () => searchObjects(prefix, debouncedQuery),
    enabled: configQuery.isSuccess && searchActive,
  });

  const navigate = (next: string) => {
    setPrefixOverride(next);
    setSelectedKeys(new Set());
    setSearchInput("");
    setDebouncedQuery("");
  };

  const displayedItems = searchActive
    ? (searchQuery.data?.items ?? [])
    : sortedItems;

  // Only files that are actually displayed right now can be downloaded, so
  // deleted/renamed entries drop out of the selection automatically.
  const selectedFiles = displayedItems.filter(
    (item) => item.type === "file" && selectedKeys.has(item.key),
  );

  const toggleSelect = (item: ObjectItem, checked: boolean) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(item.key);
      } else {
        next.delete(item.key);
      }
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      for (const item of displayedItems) {
        if (item.type !== "file") continue;
        if (checked) {
          next.add(item.key);
        } else {
          next.delete(item.key);
        }
      }
      return next;
    });
  };

  const handleBulkDownload = async () => {
    const keys = selectedFiles.map((file) => file.key);
    if (keys.length === 0) return;

    // e.g. my-bucket_2026-08-20_14-30-45.zip (local time, filename-safe)
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const filename = `${config?.bucket ?? "download"}_${stamp}.zip`;

    setBulkDownloading(true);
    const toastId = toast.loading(
      `Preparing ${keys.length} file${keys.length > 1 ? "s" : ""}…`,
    );
    try {
      await downloadZip(keys, prefix, filename);
      toast.success("Download started", { id: toastId });
      setSelectedKeys(new Set());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Download failed",
        { id: toastId },
      );
    } finally {
      setBulkDownloading(false);
    }
  };

  if (configQuery.isError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-sm font-medium text-destructive">
          Failed to load the app configuration
        </p>
        <p className="text-sm text-muted-foreground">
          {configQuery.error instanceof Error
            ? configQuery.error.message
            : "Unknown error"}
        </p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <SiteHeader
        config={config}
        loading={configQuery.isLoading}
        refreshing={objectsQuery.isFetching}
        onUpload={() => setUploadOpen(true)}
        onNewFolder={() => setNewFolderOpen(true)}
        onRefresh={() => objectsQuery.refetch()}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          {configQuery.isLoading ? (
            <Skeleton className="h-4 w-64" />
          ) : (
            <PrefixBreadcrumbs
              prefix={prefix}
              rootPrefix={config?.rootPrefix ?? ""}
              homeLabel={config?.bucket ?? "Home"}
              onNavigate={navigate}
            />
          )}
          <div className="flex shrink-0 items-center gap-2">
            <SearchInput value={searchInput} onChange={setSearchInput} />
            <SortMenu mode={sortMode} onChange={changeSort} />
            <ViewToggle view={view} onChange={changeView} />
          </div>
        </div>

        {searchActive && (
          <p className="mb-3 text-xs text-muted-foreground">
            {searchQuery.isLoading
              ? "Searching…"
              : searchQuery.data
                ? `${searchQuery.data.items.length} result${searchQuery.data.items.length === 1 ? "" : "s"} for “${debouncedQuery}”${searchQuery.data.truncated ? " — search capped, refine your query" : ""}`
                : null}
          </p>
        )}

        {searchActive ? (
          <ObjectsTable
            items={displayedItems}
            loading={searchQuery.isLoading}
            error={searchQuery.error}
            onRetry={() => searchQuery.refetch()}
            onOpenFolder={() => {}}
            onPreview={setPreviewTarget}
            onRename={setRenameTarget}
            onDelete={setDeleteTarget}
            selectedKeys={selectedKeys}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            showFolder
          />
        ) : view === "list" ? (
          <ObjectsTable
            items={sortedItems}
            loading={objectsQuery.isLoading || configQuery.isLoading}
            error={objectsQuery.error}
            onRetry={() => objectsQuery.refetch()}
            onOpenFolder={(item) => navigate(item.key)}
            onPreview={setPreviewTarget}
            onRename={setRenameTarget}
            onDelete={setDeleteTarget}
            selectedKeys={selectedKeys}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />
        ) : (
          <ObjectsGallery
            items={sortedItems}
            loading={objectsQuery.isLoading || configQuery.isLoading}
            error={objectsQuery.error}
            onRetry={() => objectsQuery.refetch()}
            onOpenFolder={(item) => navigate(item.key)}
            onPreview={setPreviewTarget}
            onRename={setRenameTarget}
            onDelete={setDeleteTarget}
            selectedKeys={selectedKeys}
            onToggleSelect={toggleSelect}
          />
        )}

        {!searchActive && objectsQuery.hasNextPage && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => objectsQuery.fetchNextPage()}
              disabled={objectsQuery.isFetchingNextPage}
            >
              {objectsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </main>

      {selectedFiles.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-popover py-2 pl-5 pr-2 shadow-lg">
          <span className="text-sm font-medium">
            {selectedFiles.length} selected
          </span>
          <Button
            size="sm"
            onClick={handleBulkDownload}
            disabled={bulkDownloading}
          >
            <Download />
            {bulkDownloading ? "Preparing…" : "Download ZIP"}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Clear selection"
            onClick={() => setSelectedKeys(new Set())}
          >
            <X />
          </Button>
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        prefix={prefix}
      />
      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        prefix={prefix}
      />
      <RenameDialog item={renameTarget} onClose={() => setRenameTarget(null)} />
      <DeleteDialog item={deleteTarget} onClose={() => setDeleteTarget(null)} />
      <PreviewDialog
        item={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
}
