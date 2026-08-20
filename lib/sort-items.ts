import type { ObjectItem } from "./api";

export type SortMode =
  | "name-asc"
  | "name-desc"
  | "newest"
  | "oldest"
  | "size-desc"
  | "size-asc";

export const SORT_MODES: { value: SortMode; label: string }[] = [
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "size-desc", label: "Largest first" },
  { value: "size-asc", label: "Smallest first" },
];

const byName = (a: ObjectItem, b: ObjectItem) => a.name.localeCompare(b.name);

/** Folders always come first, sorted A–Z. Files follow the chosen mode. */
export function sortItems(items: ObjectItem[], mode: SortMode): ObjectItem[] {
  const folders = items.filter((i) => i.type === "folder").sort(byName);
  const files = items.filter((i) => i.type === "file");

  switch (mode) {
    case "name-desc":
      files.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "newest":
      files.sort((a, b) =>
        (b.lastModified ?? "").localeCompare(a.lastModified ?? ""),
      );
      break;
    case "oldest":
      files.sort((a, b) =>
        (a.lastModified ?? "").localeCompare(b.lastModified ?? ""),
      );
      break;
    case "size-desc":
      files.sort((a, b) => b.size - a.size);
      break;
    case "size-asc":
      files.sort((a, b) => a.size - b.size);
      break;
    default:
      files.sort(byName);
  }

  return [...folders, ...files];
}
