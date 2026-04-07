"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";

const navItems = [
  { href: "/", icon: "rss_feed", label: "Intelligence Feed" },
  { href: "/translation-lab", icon: "g_translate", label: "Translation Lab" },
  { href: "/report-archive", icon: "description", label: "Report Archive" },
  { href: "/report/new", icon: "picture_as_pdf", label: "Export Center" },
  { href: "/settings", icon: "admin_panel_settings", label: "Security Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-low flex flex-col z-50">
      <div className="p-6 pb-4">
        <h1 className="font-headline text-xl font-bold text-on-surface tracking-tight">Sentinel Lens</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mt-1">Cybersecurity Intelligence</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                isActive ? "bg-surface-container-high border-l-4 border-primary text-primary font-semibold" : "text-slate-400 hover:text-slate-200 hover:bg-surface-container"
              }`}>
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-3">
        <Button variant="primary" size="md" className="w-full">
          <span className="material-symbols-outlined text-lg">add</span>
          New Analysis
        </Button>
        <div className="flex flex-col gap-1">
          <Link href="#" className="flex items-center gap-2 px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-sm">help_outline</span>
            Support
          </Link>
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors text-left">
            <span className="material-symbols-outlined text-sm">logout</span>
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
