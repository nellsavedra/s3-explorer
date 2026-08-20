"use client";

import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SORT_MODES, type SortMode } from "@/lib/sort-items";

interface SortMenuProps {
  mode: SortMode;
  onChange: (mode: SortMode) => void;
}

export function SortMenu({ mode, onChange }: SortMenuProps) {
  const current = SORT_MODES.find((m) => m.value === mode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" aria-label="Sort items" />}
      >
        <ArrowUpDown />
        <span className="hidden sm:inline">{current?.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => onChange(value as SortMode)}
        >
          {SORT_MODES.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
