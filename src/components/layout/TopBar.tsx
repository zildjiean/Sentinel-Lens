"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const pageTitles: Record<string, string> = {
  "/": "Intelligence Feed",
  "/translation-lab": "Translation Lab",
  "/report-archive": "Report Archive",
  "/report/new": "Export Center",
  "/settings": "Security Settings",
};

export function TopBar() {
  const pathname = usePathname();
  const title = Object.entries(pageTitles).find(([path]) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path)
  )?.[1] || "Sentinel Lens";

  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-surface/80 backdrop-blur-md z-40 flex items-center justify-between px-8">
      <div className="flex items-center gap-6">
        <h2 className="font-headline text-lg font-semibold text-on-surface">{title}</h2>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/" className="px-3 py-1 text-on-surface-variant hover:text-on-surface transition-colors">Global Feed</Link>
          <span className="text-outline-variant">|</span>
          <Link href="/report-archive" className="px-3 py-1 text-on-surface-variant hover:text-on-surface transition-colors">My Reports</Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-56"><Input icon="search" placeholder="Search threats..." /></div>
        <ThemeToggle />
        <button className="p-2 text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="p-2 text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">history</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden">
          <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">U</div>
        </div>
      </div>
    </header>
  );
}
