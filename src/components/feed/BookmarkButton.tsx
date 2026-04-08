"use client";

import { useState, useEffect } from "react";

interface BookmarkButtonProps {
  articleId: string;
}

export function BookmarkButton({ articleId }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkBookmark() {
      try {
        const res = await fetch("/api/bookmarks");
        const data = await res.json();
        const found = data.bookmarks?.find((b: { article_id: string; note: string | null }) => b.article_id === articleId);
        if (found) {
          setBookmarked(true);
          setNote(found.note || "");
        }
      } catch { /* ignore */ }
    }
    checkBookmark();
  }, [articleId]);

  async function toggleBookmark() {
    setSaving(true);
    try {
      if (bookmarked) {
        await fetch("/api/bookmarks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ article_id: articleId }),
        });
        setBookmarked(false);
        setNote("");
        setShowNote(false);
      } else {
        await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ article_id: articleId, note }),
        });
        setBookmarked(true);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function saveNote() {
    setSaving(true);
    try {
      await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article_id: articleId, note }),
      });
    } catch { /* ignore */ }
    setSaving(false);
    setShowNote(false);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          onClick={toggleBookmark}
          disabled={saving}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
            bookmarked
              ? "text-secondary bg-secondary/10"
              : "text-on-surface-variant hover:bg-surface-container-high"
          }`}
          title={bookmarked ? "Remove bookmark" : "Bookmark this article"}
        >
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: bookmarked ? "'FILL' 1" : "'FILL' 0" }}>
            bookmark
          </span>
          {bookmarked ? "Bookmarked" : "Bookmark"}
        </button>
        {bookmarked && (
          <button
            onClick={() => setShowNote(!showNote)}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container-high transition-colors"
            title="Add/edit note"
          >
            <span className="material-symbols-outlined text-sm">edit_note</span>
          </button>
        )}
      </div>
      {showNote && (
        <div className="absolute top-full left-0 mt-2 w-72 p-3 rounded-xl bg-surface-container border border-outline-variant/20 shadow-lg z-50">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a personal note..."
            className="w-full h-20 text-sm bg-surface-container-low rounded-lg p-2 text-on-surface placeholder:text-on-surface-variant/50 border border-outline-variant/20 focus:border-primary focus:outline-none resize-none"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowNote(false)} className="px-3 py-1 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container-high transition-colors">Cancel</button>
            <button onClick={saveNote} disabled={saving} className="px-3 py-1 rounded-lg text-xs font-medium bg-primary text-[#263046] disabled:opacity-50 transition-colors">Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
