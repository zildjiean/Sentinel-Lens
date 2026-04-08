"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import Image from "next/image";
import { X, Link as LinkIcon, Globe, Hourglass, Sparkles, TriangleAlert, Info, PenLine, CircleAlert, ArrowLeft, Save } from "lucide-react";

interface AnalysisResult {
  title: string;
  content: string;
  excerpt: string;
  severity: string;
  severity_reason: string;
  tags: string[];
  author: string | null;
  image_url: string | null;
  url: string;
  duplicate_warning?: {
    duplicate: boolean;
    existing_id: string;
    existing_title: string;
  };
}

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical", color: "text-error" },
  { value: "high", label: "High", color: "text-tertiary" },
  { value: "medium", label: "Medium", color: "text-primary" },
  { value: "low", label: "Low", color: "text-secondary" },
  { value: "info", label: "Info", color: "text-on-surface-variant" },
];

const AVAILABLE_TAGS = [
  "Ransomware", "Phishing", "APT", "Zero-Day", "Malware",
  "Vulnerability", "Data Breach", "DDoS", "Cloud Security", "IoT",
  "Supply Chain", "Cryptocurrency", "Critical Infrastructure", "Healthcare", "Financial",
];

export default function NewArticlePage() {
  const router = useRouter();

  // Step 1: URL Input
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Step 2: Edit Form
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [severityReason, setSeverityReason] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [author, setAuthor] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [newTag, setNewTag] = useState("");

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!url.trim()) return;
    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const res = await fetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If scrape partially worked, still populate form
        if (data.scraped) {
          populateForm({
            ...data.scraped,
            excerpt: "",
            severity: "medium",
            severity_reason: "",
            tags: [],
          });
          setAnalyzeError(data.error + " — Content partially extracted. Please review and complete manually.");
        } else {
          setAnalyzeError(data.error || "Analysis failed");
        }
        return;
      }

      populateForm(data);
    } catch {
      setAnalyzeError("Network error. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  function populateForm(data: AnalysisResult) {
    setResult(data);
    setTitle(data.title || "");
    setContent(data.content || "");
    setExcerpt(data.excerpt || "");
    setSeverity(data.severity || "medium");
    setSeverityReason(data.severity_reason || "");
    setTags(data.tags || []);
    setAuthor(data.author || "");
    setImageUrl(data.image_url || "");
  }

  function addTag(tag: string) {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setNewTag("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      setSaveError("Title and content are required.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          excerpt: excerpt.trim(),
          severity,
          tags,
          author: author.trim() || null,
          url: url.trim() || null,
          image_url: imageUrl.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error || "Failed to save article");
        return;
      }

      router.push(`/article/${data.article_id}`);
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">
            New Analysis
          </h1>
          <p className="text-sm text-on-surface-variant">
            Paste a URL to automatically analyze and add to the Intelligence Feed
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          <X className="w-5 h-5" />
          Cancel
        </Link>
      </div>

      {/* Step 1: URL Input */}
      <Card variant="low">
        <h2 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-primary" />
          {result ? "Source URL" : "Step 1 — Enter Article URL"}
        </h2>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !analyzing && handleAnalyze()}
              placeholder="https://example.com/security-article..."
              disabled={analyzing}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container text-on-surface text-sm placeholder:text-on-surface-variant/50 border border-outline-variant/20 focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !url.trim()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-[#263046] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Hourglass className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {result ? "Re-analyze" : "Analyze"}
              </>
            )}
          </button>
        </div>

        {analyzeError && (
          <div className="mt-3 px-4 py-2.5 rounded-lg bg-error/10 border border-error/20 text-error text-xs">
            <TriangleAlert className="w-3.5 h-3.5 inline align-middle mr-1" />
            {analyzeError}
          </div>
        )}

        {result?.duplicate_warning && (
          <div className="mt-3 px-4 py-2.5 rounded-lg bg-tertiary/10 border border-tertiary/20 text-tertiary text-xs">
            <Info className="w-3.5 h-3.5 inline align-middle mr-1" />
            This URL has already been analyzed: &ldquo;{result.duplicate_warning.existing_title}&rdquo;
            <Link href={`/article/${result.duplicate_warning.existing_id}`} className="underline ml-1 hover:text-on-surface">
              View existing
            </Link>
          </div>
        )}
      </Card>

      {/* Step 2: Edit Form */}
      {result && (
        <>
          <Card variant="low">
            <h2 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
              <PenLine className="w-5 h-5 text-secondary" />
              Step 2 — Review & Edit
            </h2>

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              {/* Content */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none transition-colors resize-y"
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 flex items-center gap-2 block">
                  Excerpt
                  <span className="text-[9px] text-primary normal-case tracking-normal">(AI-generated summary)</span>
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none transition-colors resize-y"
                />
              </div>

              {/* Severity + Author row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">
                    Severity
                  </label>
                  <div className="flex gap-2">
                    {SEVERITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSeverity(opt.value)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${
                          severity === opt.value
                            ? `bg-primary/10 border-primary/30 ${opt.color}`
                            : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {severityReason && (
                    <p className="text-[10px] text-on-surface-variant/70 mt-1.5 italic">
                      AI reasoning: {severityReason}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">
                    Author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Author name (optional)"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => removeTag(tag)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-error/10 hover:text-error transition-colors group"
                    >
                      {tag}
                      <X className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </button>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-xs text-on-surface-variant/50 italic">No tags — click below to add</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] hover:text-on-surface hover:bg-surface-container-highest transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
                {/* Custom tag input */}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { addTag(newTag.trim()); e.preventDefault(); } }}
                    placeholder="Add custom tag..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs border border-outline-variant/20 focus:border-primary focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => addTag(newTag.trim())}
                    disabled={!newTag.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Image preview */}
              {imageUrl && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">
                    Preview Image
                  </label>
                  <div className="flex items-start gap-3">
                    <Image
                      src={imageUrl}
                      alt="Article preview"
                      width={128}
                      height={80}
                      className="w-32 h-20 object-cover rounded-lg bg-surface-container-high"
                      unoptimized
                    />
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs border border-outline-variant/20 focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Save Error */}
          {saveError && (
            <div className="px-4 py-2.5 rounded-lg bg-error/10 border border-error/20 text-error text-xs">
              <CircleAlert className="w-3.5 h-3.5 inline align-middle mr-1" />
              {saveError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Cancel
            </Link>

            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !content.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-secondary text-[#263046] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Hourglass className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save to Feed
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
