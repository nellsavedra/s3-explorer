"use client";

import { Download, File, Link2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useConfigData } from "@/hooks/use-config";
import { assetUrl, downloadUrl, previewUrl, type ObjectItem } from "@/lib/api";
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
        {imageFailed ? (
          <div
            className="flex cursor-default flex-col items-center gap-2 text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <File className="size-12 text-white/40" />
            <p className="text-sm font-medium text-white">
              No preview available
            </p>
            <p className="text-xs text-white/60">
              This file cannot be displayed in the browser
            </p>
          </div>
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
