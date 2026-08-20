"use client";

import { FolderPlus, HardDrive, RefreshCw, Upload } from "lucide-react";

import { ThemeToggle } from "@/components/explorer/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BrandConfig } from "@/lib/api";

interface SiteHeaderProps {
  config: BrandConfig | undefined;
  loading: boolean;
  refreshing: boolean;
  onUpload: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
}

export function SiteHeader({
  config,
  loading,
  refreshing,
  onUpload,
  onNewFolder,
  onRefresh,
}: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4">
        {loading ? (
          <>
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-4 w-40" />
          </>
        ) : (
          <>
            {config?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- whitelabel logo from runtime env var
              <img
                src={config.logoUrl}
                alt={config.title}
                className="size-8 object-contain"
              />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <HardDrive className="size-4" />
              </div>
            )}
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold leading-tight tracking-tight">
                {config?.title ?? "S3 Explorer"}
              </span>
              {config?.bucket && (
                <span className="truncate text-xs leading-tight text-muted-foreground">
                  {config.bucket}
                </span>
              )}
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Refresh"
                  onClick={onRefresh}
                />
              }
            >
              <RefreshCw
                className={refreshing ? "animate-spin" : undefined}
              />
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
          <Button variant="outline" size="sm" onClick={onNewFolder}>
            <FolderPlus />
            New folder
          </Button>
          <Button size="sm" onClick={onUpload}>
            <Upload />
            Upload
          </Button>
        </div>
      </div>
    </header>
  );
}
