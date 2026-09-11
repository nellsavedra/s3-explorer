"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, File, Link2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useConfigData } from "@/hooks/use-config";
import {
  assetUrl,
  downloadUrl,
  fetchPreviewText,
  hasFileExtension,
  isImageFile,
  isPdfFile,
  isTextFile,
  MAX_TEXT_PREVIEW_BYTES,
  previewUrl,
  sniffObject,
  type ObjectItem,
} from "@/lib/api";
import { copyText } from "@/lib/clipboard";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PreviewDialogProps {
  item: ObjectItem | null;
  onClose: () => void;
}

/** Fullscreen lightbox, rendered in a portal over the whole app. */
export function PreviewDialog({ item, onClose }: PreviewDialogProps) {
  if (!item) return null;
  // Remount per item so image state (loading / error) resets.
  return <Lightbox key={item.key} item={item} onClose={onClose} />;
}

function Lightbox({ item, onClose }: { item: ObjectItem; onClose: () => void }) {
  const cdnBaseUrl = useConfigData()?.cdnBaseUrl;
  const [loaded, setLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Files without an extension are sniffed server-side (magic bytes) to
  // learn their kind; the query cache is shared with the gallery.
  const needsSniff = !hasFileExtension(item.name) && item.size > 0;
  const sniffQuery = useQuery({
    queryKey: ["sniff", item.key],
    queryFn: () => sniffObject(item.key),
    enabled: needsSniff,
    staleTime: 5 * 60 * 1000,
  });

  const kind: "image" | "pdf" | "text" | "unknown" = isImageFile(item.name)
    ? "image"
    : isPdfFile(item.name)
      ? "pdf"
      : isTextFile(item.name)
        ? "text"
        : sniffQuery.data
          ? sniffQuery.data.image
            ? "image"
            : sniffQuery.data.pdf
              ? "pdf"
              : sniffQuery.data.text
                ? "text"
                : "unknown"
          : "image";

  const textQuery = useQuery({
    queryKey: ["preview-text", item.key],
    queryFn: () => fetchPreviewText(item.key),
    enabled:
      kind === "text" &&
      item.size <= MAX_TEXT_PREVIEW_BYTES,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const copyAssetUrl = async () => {
    if (!cdnBaseUrl) return;
    try {
      await copyText(assetUrl(cdnBaseUrl, item.key));
      toast.success("URL copied to clipboard");
    } catch {
      toast.error("Failed to copy the URL");
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${item.name}`}
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onClick={onClose}
    >
      <div
        className="flex items-center gap-2 px-4 py-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0 flex-1 text-white">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="text-xs text-white/60">{formatBytes(item.size)}</p>
        </div>
        {cdnBaseUrl && (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <a
                href={assetUrl(cdnBaseUrl, item.key)}
                target="_blank"
                rel="noreferrer"
              />
            }
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <ExternalLink />
            Open
          </Button>
        )}
        {cdnBaseUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={copyAssetUrl}
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <Link2 />
            Copy URL
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<a href={downloadUrl(item.key)} />}
          className="text-white hover:bg-white/10 hover:text-white"
        >
          <Download />
          Download
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close preview"
          onClick={onClose}
          className="text-white hover:bg-white/10 hover:text-white"
        >
          <X />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 cursor-zoom-out items-center justify-center p-4">
        {kind === "pdf" ? (
          <iframe
            src={previewUrl(item.key)}
            title={item.name}
            className="size-full rounded-xl bg-white"
            onClick={(event) => event.stopPropagation()}
          />
        ) : kind === "text" ? (
          item.size > MAX_TEXT_PREVIEW_BYTES ? (
            <Fallback
              title="Text file too large to preview"
              hint={`Files over ${formatBytes(MAX_TEXT_PREVIEW_BYTES)} can't be shown inline`}
            />
          ) : textQuery.isLoading ? (
            <p className="text-sm text-white/60">Loading…</p>
          ) : textQuery.isError ? (
            <Fallback
              title="Couldn't load the file"
              hint={
                textQuery.error instanceof Error
                  ? textQuery.error.message
                  : "Unknown error"
              }
            />
          ) : (
            <div
              className="max-h-full w-full max-w-4xl cursor-default overflow-auto rounded-xl bg-white p-4 text-left"
              onClick={(event) => event.stopPropagation()}
            >
              <pre className="whitespace-pre-wrap break-words font-mono text-sm text-neutral-900">
                {textQuery.data}
              </pre>
            </div>
          )
        ) : imageFailed ? (
          <Fallback
            title="No preview available"
            hint="This file cannot be displayed in the browser"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- proxied S3 object URL
          <img
            src={previewUrl(item.key)}
            alt={item.name}
            onLoad={() => setLoaded(true)}
            onError={() => setImageFailed(true)}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "max-h-full max-w-full cursor-default object-contain transition-opacity duration-200",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

function Fallback({ title, hint }: { title: string; hint: string }) {
  return (
    <div
      className="flex cursor-default flex-col items-center gap-2 text-center"
      onClick={(event) => event.stopPropagation()}
    >
      <File className="size-12 text-white/40" />
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="text-xs text-white/60">{hint}</p>
    </div>
  );
}
