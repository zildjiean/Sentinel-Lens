"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { ExportButton } from "@/components/feed/ExportButton";

const pageTitles: Record<string, string> = {
  "/": "Intelligence Feed",
  "/analytics": "Analytics",
  "/translation-lab": "Translation Lab",
  "/report-archive": "Report Archive",
  "/report/new": "Export Center",
  "/bookmarks": "My Bookmarks",
  "/audit-log": "Audit Log",
  "/system-health": "System Health",
  "/settings": "Settings",
};

export function TopBar() {
  const pathname = usePathname();
  const title = Object.entries(pageTitles).find(([path]) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path)
  )?.[1] || "Sentinel Lens";

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-surface/80 backdrop-blur-md z-40 flex items-center justify-between px-4 lg:px-8 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-6">
        <div className="w-10 lg:hidden" /> {/* Spacer for hamburger */}
        <h2 className="font-headline text-lg font-semibold text-on-surface">{title}</h2>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link href="/" className="px-3 py-1 text-on-surface-variant hover:text-on-surface transition-colors">Global Feed</Link>
          <span className="text-outline-variant">|</span>
          <Link href="/report-archive" className="px-3 py-1 text-on-surface-variant hover:text-on-surface transition-colors">My Reports</Link>
        </nav>
      </div>
      <div className="flex items-center gap-2 lg:gap-4">
        <ExportButton />
        <ThemeToggle />
        <NotificationBell />
        <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden">
          <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">U</div>
        </div>
      </div>
    </header>
  );
}
