import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names and resolve Tailwind conflicts.
 *
 * `clsx` handles arrays/objects/conditionals; `twMerge` ensures later utilities
 * win over earlier conflicting ones (e.g. `cn("px-2", "px-4")` -> `"px-4"`).
 * This is the single class-composition helper for the whole UI layer.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
