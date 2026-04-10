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
      className={`${featured ? "md:col-span-2" : ""} !p-0 overflow-hidden ${
        article.severity === "critical"
          ? "ring-1 ring-error/40"
          : article.severity === "high"
          ? "ring-1 ring-tertiary/30"
          : ""
      }`}
    >
      {/* Hero Image / Fallback */}
      <div className="relative aspect-video w-full overflow-hidden">
        {article.image_url ? (
          <Image
            src={article.image_url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
            <TagIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-white/10" strokeWidth={1} />
          </div>
        )}

        {/* Severity badge overlay */}
        <div className="absolute top-3 left-3">
          <Badge severity={article.severity} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-on-surface-variant">{timeAgo}</span>
          {article.translations && (
            <span className="text-[10px] uppercase tracking-widest text-primary flex items-center gap-1">
              <Languages className="w-3.5 h-3.5" />
              TH
            </span>
          )}
        </div>

        <Link href={`/article/${article.id}`}>
          <h3
            className={`font-headline text-base font-bold line-clamp-2 hover:text-primary transition-colors duration-200 ${
              article.severity === "critical" ? "text-error" : "text-on-surface"
            }`}
          >
            {article.title}
          </h3>
        </Link>

        <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
          {article.excerpt}
        </p>

        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
