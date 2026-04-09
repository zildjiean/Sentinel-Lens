"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Rss,
  BarChart3,
  Languages,
  FileText,
  Bookmark,
  History,
  Activity,
  ShieldCheck,
  Shield,
  X,
  Menu,
  Plus,
  LogOut,
  FileBarChart,
  Eye,
  type LucideIcon,
} from "lucide-react";

const navItems: { href: string; icon: LucideIcon; label: string }[] = [
  { href: "/", icon: Rss, label: "Intelligence Feed" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/translation-lab", icon: Languages, label: "Translation Lab" },
  { href: "/report-archive", icon: FileText, label: "Report Archive" },
  { href: "/report/new", icon: FileText, label: "Export Center" },
  { href: "/iocs", icon: Shield, label: "IOC Management" },
  { href: "/bookmarks", icon: Bookmark, label: "My Bookmarks" },
  { href: "/audit-log", icon: History, label: "Audit Log" },
  { href: "/system-health", icon: Activity, label: "System Health" },
  { href: "/enterprise-report", icon: FileBarChart, label: "Enterprise Report" },
  { href: "/watchlist", icon: Eye, label: "Watch List" },
  { href: "/settings", icon: ShieldCheck, label: "Settings" },
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
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav aria-label="Main navigation" className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${
                isActive ? "bg-surface-container-high border-l-4 border-primary text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}>
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-3">
        <Link href="/article/new" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-primary text-[#263046] text-sm font-semibold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low">
          <Plus className="w-5 h-5" />
          New Analysis
        </Link>
        <div className="flex flex-col gap-1">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
        <div className="pt-2 border-t border-surface-container text-center">
          <span className="text-[10px] text-on-surface-variant/50 tracking-wide">v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        aria-label="Toggle mobile menu"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Menu className="w-5 h-5" />
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
