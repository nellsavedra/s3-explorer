"use client";

import { LayoutGrid, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "gallery";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-background p-0.5">
      {(
        [
          { mode: "list" as const, icon: List, label: "List view" },
          { mode: "gallery" as const, icon: LayoutGrid, label: "Gallery view" },
        ] as const
      ).map(({ mode, icon: Icon, label }) => (
        <Tooltip key={mode}>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={label}
                aria-pressed={view === mode}
                onClick={() => onChange(mode)}
                className={cn(
                  view === mode &&
                    "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                )}
              />
            }
          >
            <Icon />
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
