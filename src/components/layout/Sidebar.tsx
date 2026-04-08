"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", icon: "rss_feed", label: "Intelligence Feed" },
  { href: "/analytics", icon: "analytics", label: "Analytics" },
  { href: "/translation-lab", icon: "g_translate", label: "Translation Lab" },
  { href: "/report-archive", icon: "description", label: "Report Archive" },
  { href: "/report/new", icon: "picture_as_pdf", label: "Export Center" },
  { href: "/bookmarks", icon: "bookmark", label: "My Bookmarks" },
  { href: "/audit-log", icon: "history", label: "Audit Log" },
  { href: "/system-health", icon: "monitoring", label: "System Health" },
  { href: "/settings", icon: "admin_panel_settings", label: "Settings" },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const sidebarContent = (
    <>
      <div className="p-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-headline text-xl font-bold text-on-surface tracking-tight">Sentinel Lens</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mt-1">Cybersecurity Intelligence</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 text-on-surface-variant hover:text-on-surface"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                isActive ? "bg-surface-container-high border-l-4 border-primary text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}>
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-3">
        <Link href="/article/new" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-primary text-[#263046] text-sm font-semibold hover:opacity-90 transition-opacity">
          <span className="material-symbols-outlined text-lg">add</span>
          New Analysis
        </Link>
        <div className="flex flex-col gap-1">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors text-left"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Sign Out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface shadow-lg"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - desktop always visible, mobile slides in */}
      <aside className={`h-screen w-64 fixed left-0 top-0 bg-surface-container-low flex flex-col z-50 transition-transform duration-300 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        {sidebarContent}
      </aside>
    </>
  );
}
