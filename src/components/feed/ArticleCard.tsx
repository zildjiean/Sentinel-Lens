import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import {
  Languages,
  Shield,
  Bug,
  Lock,
  Server,
  AlertTriangle,
  Database,
  Wifi,
  Eye,
  FileWarning,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ArticleWithTranslation } from "@/lib/types/database";

interface ArticleCardProps {
  article: ArticleWithTranslation;
  featured?: boolean;
}

const TAG_ICONS: Record<string, React.ElementType> = {
  vulnerability: Bug,
  vulnerabilities: Bug,
  cve: Bug,
  exploit: Bug,
  malware: Bug,
  ransomware: Lock,
  encryption: Lock,
  privacy: Eye,
  surveillance: Eye,
  phishing: FileWarning,
  "data breach": Database,
  "data breaches": Database,
  breach: Database,
  ddos: Wifi,
  network: Wifi,
  infrastructure: Server,
  cloud: Server,
  apt: AlertTriangle,
  threat: AlertTriangle,
};

const SEVERITY_GRADIENTS: Record<string, string> = {
  critical: "from-red-950 to-red-800",
  high: "from-orange-950 to-orange-800",
  medium: "from-blue-950 to-blue-800",
  low: "from-green-950 to-green-800",
  info: "from-slate-800 to-slate-600",
};

function getTagIcon(tags: string[]): React.ElementType {
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    for (const [keyword, icon] of Object.entries(TAG_ICONS)) {
      if (lower.includes(keyword)) return icon;
    }
  }
  return Shield;
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const timeAgo = formatDistanceToNow(new Date(article.published_at), {
    addSuffix: true,
    locale: th,
  });

  const TagIcon = getTagIcon(article.tags);
  const gradient = SEVERITY_GRADIENTS[article.severity] || SEVERITY_GRADIENTS.info;

  return (
    <Card
      variant="low"
      hoverable
      className={`${featured ? "md:col-span-2" : ""} overflow-hidden ${
        article.severity === "critical"
          ? "ring-1 ring-error/40 relative"
          : article.severity === "high"
          ? "ring-1 ring-tertiary/30 relative"
          : ""
      }`}
    >
      {/* Severity accent for critical/high */}
      {article.severity === "critical" && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-error via-error/60 to-transparent" />
      )}
      {article.severity === "high" && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-tertiary via-tertiary/60 to-transparent" />
      )}

      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
          {article.image_url ? (
            <Image
              src={article.image_url}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <TagIcon className="w-8 h-8 text-white/15" strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Badge severity={article.severity} />
            <span className="text-[10px] text-on-surface-variant flex-shrink-0">{timeAgo}</span>
          </div>

          <Link href={`/article/${article.id}`}>
            <h3
              className={`font-headline text-sm font-bold line-clamp-2 hover:text-primary transition-colors duration-200 leading-snug ${
                article.severity === "critical" ? "text-error" : "text-on-surface"
              }`}
            >
              {article.title}
            </h3>
          </Link>

          <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
            {article.excerpt}
          </p>
        </div>
      </div>

      {/* Footer: tags + translation */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-outline-variant/10">
        <div className="flex flex-wrap gap-1.5">
          {article.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant"
            >
              {tag}
            </span>
          ))}
        </div>

        {article.translations && (
          <span className="text-[10px] uppercase tracking-widest text-primary flex items-center gap-1">
            <Languages className="w-3.5 h-3.5" />
            TH
          </span>
        )}
      </div>
    </Card>
  );
}
