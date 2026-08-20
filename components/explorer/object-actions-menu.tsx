"use client";

import { Download, Link2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfigData } from "@/hooks/use-config";
import { assetUrl, downloadUrl, type ObjectItem } from "@/lib/api";
import { copyText } from "@/lib/clipboard";

interface ObjectActionsMenuProps {
  item: ObjectItem;
  onRename: (item: ObjectItem) => void;
  onDelete: (item: ObjectItem) => void;
  className?: string;
}

export function ObjectActionsMenu({
  item,
  onRename,
  onDelete,
  className,
}: ObjectActionsMenuProps) {
  const cdnBaseUrl = useConfigData()?.cdnBaseUrl;

  const copyAssetUrl = async () => {
    if (!cdnBaseUrl) return;
    try {
      await copyText(assetUrl(cdnBaseUrl, item.key));
      toast.success("URL copied to clipboard");
    } catch {
      toast.error("Failed to copy the URL");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${item.name}`}
            className={className}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {item.type === "file" && cdnBaseUrl && (
          <DropdownMenuItem onClick={copyAssetUrl}>
            <Link2 />
            Copy URL
          </DropdownMenuItem>
        )}
        {item.type === "file" && (
          <DropdownMenuItem render={<a href={downloadUrl(item.key)} />}>
            <Download />
            Download
          </DropdownMenuItem>
        )}
        {item.type === "file" && (
          <DropdownMenuItem onClick={() => onRename(item)}>
            <Pencil />
            Rename
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete(item)}
        >
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
