// file: client/src/components/FullScreenLayout.tsx
import { ReactNode } from "react";
import TopNav from "./TopNav";

/**
 * Layout that provides a top‑navigation bar and a full‑screen container.
 * All page content is rendered as children, inheriting the existing theme
 * (background, foreground, dark‑mode). This replaces the previous app‑shell
 * layout for a "top‑nav only" experience.
 */
export default function FullScreenLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopNav />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
