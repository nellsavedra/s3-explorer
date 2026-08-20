"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState, useSyncExternalStore } from "react";

import { DeleteDialog } from "@/components/explorer/delete-dialog";
import { PreviewDialog } from "@/components/explorer/preview-dialog";
import { NewFolderDialog } from "@/components/explorer/new-folder-dialog";
import { ObjectsGallery } from "@/components/explorer/objects-gallery";
import { ObjectsTable } from "@/components/explorer/objects-table";
import { PrefixBreadcrumbs } from "@/components/explorer/prefix-breadcrumbs";
import { RenameDialog } from "@/components/explorer/rename-dialog";
import { SiteHeader } from "@/components/explorer/site-header";
import { SortMenu } from "@/components/explorer/sort-menu";
import { UploadDialog } from "@/components/explorer/upload-dialog";
import { ViewToggle, type ViewMode } from "@/components/explorer/view-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfig } from "@/hooks/use-config";
import { fetchObjects, type ObjectItem } from "@/lib/api";
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
              onNavigate={setPrefixOverride}
            />
          )}
          <div className="flex shrink-0 items-center gap-2">
            <SortMenu mode={sortMode} onChange={changeSort} />
            <ViewToggle view={view} onChange={changeView} />
          </div>
        </div>

        {view === "list" ? (
          <ObjectsTable
            items={sortedItems}
            loading={objectsQuery.isLoading || configQuery.isLoading}
            error={objectsQuery.error}
            onRetry={() => objectsQuery.refetch()}
            onOpenFolder={(item) => setPrefixOverride(item.key)}
            onPreview={setPreviewTarget}
            onRename={setRenameTarget}
            onDelete={setDeleteTarget}
          />
        ) : (
          <ObjectsGallery
            items={sortedItems}
            loading={objectsQuery.isLoading || configQuery.isLoading}
            error={objectsQuery.error}
            onRetry={() => objectsQuery.refetch()}
            onOpenFolder={(item) => setPrefixOverride(item.key)}
            onPreview={setPreviewTarget}
            onRename={setRenameTarget}
            onDelete={setDeleteTarget}
          />
        )}

        {objectsQuery.hasNextPage && (
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
