import type { ComponentType } from "react";
import { SECTIONS } from "@/lib/constants/site";
import type { SectionId, SectionProps } from "@/types";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { SneakPeek } from "@/components/sections/SneakPeek";
import { Why } from "@/components/sections/Why";

/**
 * PURE composition surface — registry-driven.
 *
 * Maps the ordered `SECTIONS` registry (the single source of scroll/anchor
 * order) to its section island. Every section is registered in `SECTION_ISLANDS`
 * keyed by its `SectionId`, so the loop below stays a dumb, ordered render with
 * no per-section branching. Reshaping the page = edit `SECTIONS` in
 * `lib/constants/site.ts` and/or this map; never re-wire the loop.
 *
 * `satisfies` makes the map exhaustive: every `SectionId` MUST have an island,
 * so adding a section to the registry without wiring it here is a type error.
 */
const SECTION_ISLANDS = {
  hero: Hero,
  "sneak-peek": SneakPeek,
  why: Why,
  footer: Footer,
} satisfies Record<SectionId, ComponentType<SectionProps>>;

export default function Home() {
  return (
    <main className="flex min-h-[100dvh] flex-col">
      {SECTIONS.map((section) => {
        const Island = SECTION_ISLANDS[section.id];
        return <Island key={section.id} id={section.id} />;
      })}
    </main>
  );
}
