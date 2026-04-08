"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Languages, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface TranslateButtonProps {
  articleId: string;
}

export function TranslateButton({ articleId }: TranslateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleTranslate() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article_id: articleId }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Translation failed");
      } else {
        setSuccess(true);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 text-secondary text-sm">
        <CheckCircle className="w-5 h-5" />
        Translation complete! Refreshing...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        variant="primary"
        size="lg"
        onClick={handleTranslate}
        disabled={loading}
        className="gap-2"
      >
        <Languages className="w-5 h-5" />
        {loading ? "Translating..." : "Translate to Thai"}
      </Button>
      {error && (
        <p className="text-error text-sm">{error}</p>
      )}
    </div>
  );
}
