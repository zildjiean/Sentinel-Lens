"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface DeleteArticleButtonProps {
  articleId: string;
  articleTitle: string;
}

export function DeleteArticleButton({ articleId, articleTitle }: DeleteArticleButtonProps) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete this article?\n\n"${articleTitle}"\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to delete article");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-error hover:bg-error/10 transition-colors disabled:opacity-50"
      title="Delete this article (Admin only)"
    >
      <Trash2 className="w-4 h-4" />
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}
