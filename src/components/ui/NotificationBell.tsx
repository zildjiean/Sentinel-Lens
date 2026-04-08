"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bell,
  TriangleAlert,
  FileText as ArticleIcon,
  Languages,
  FileText,
  Info,
  type LucideIcon,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string | null;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  critical_threat: TriangleAlert,
  new_article: ArticleIcon,
  translation_done: Languages,
  report_generated: FileText,
  system: Info,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-error",
  high: "text-tertiary",
  medium: "text-primary",
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    async function load() {
      // Only fetch when tab is visible
      if (document.hidden) return;
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications ?? []);
        }
      } catch { /* ignore - user might not be logged in */ }
    }

    load();
    // Poll every 60s instead of 30s, and only when tab is visible
    interval = setInterval(load, 60000);

    function handleVisibility() {
      if (!document.hidden) load();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read_all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span aria-live="polite" className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] flex items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl bg-surface-container border border-outline-variant/20 shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10">
            <h3 className="text-sm font-semibold text-on-surface">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-primary hover:text-secondary transition-colors">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant text-xs">
              No notifications
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    markRead(n.id);
                    if (n.link) window.location.href = n.link;
                  }}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-surface-container-high/50 transition-colors ${
                    !n.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  {(() => {
                    const IconComp = TYPE_ICONS[n.type] || Info;
                    return <IconComp className={`w-5 h-5 mt-0.5 ${SEVERITY_COLORS[n.severity || ""] || "text-on-surface-variant"}`} />;
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${!n.is_read ? "text-on-surface" : "text-on-surface-variant"}`}>
                      {n.title}
                    </p>
                    <p className="text-[10px] text-on-surface-variant/70 line-clamp-2 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-on-surface-variant/50 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
