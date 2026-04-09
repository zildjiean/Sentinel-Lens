import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MatchTimeline } from "@/components/watchlist/MatchTimeline";
import type { WatchlistWithKeywords } from "@/lib/types/enterprise";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WatchlistDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  const { data: watchlist, error } = await supabase
    .from("watchlists")
    .select("*, watchlist_keywords(*)")
    .eq("id", id)
    .eq("created_by", user.id)
    .single();

  if (error || !watchlist) return notFound();

  const wl = watchlist as unknown as WatchlistWithKeywords;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`w-2.5 h-2.5 rounded-full ${wl.is_active ? "bg-[#4ade80]" : "bg-outline-variant"}`}
          />
          <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight">
            {wl.name}
          </h1>
        </div>
        {wl.description && (
          <p className="text-sm text-on-surface-variant font-body mt-1 ml-4">{wl.description}</p>
        )}
      </div>

      {/* Stats / meta */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-surface-container-low rounded-xl px-4 py-3 flex flex-col gap-0.5">
          <span className="text-xs text-on-surface-variant font-body uppercase tracking-wider">Notify Mode</span>
          <span className="text-sm font-semibold text-on-surface font-body">
            {wl.notify_mode === "realtime"
              ? "Real-time"
              : `Batch every ${wl.batch_interval_minutes} min`}
          </span>
        </div>
        <div className="bg-surface-container-low rounded-xl px-4 py-3 flex flex-col gap-0.5">
          <span className="text-xs text-on-surface-variant font-body uppercase tracking-wider">Summary Level</span>
          <span className="text-sm font-semibold text-on-surface font-body capitalize">{wl.summary_level}</span>
        </div>
        <div className="bg-surface-container-low rounded-xl px-4 py-3 flex flex-col gap-0.5">
          <span className="text-xs text-on-surface-variant font-body uppercase tracking-wider">Keywords</span>
          <span className="text-sm font-semibold text-on-surface font-body">
            {wl.watchlist_keywords.length}
          </span>
        </div>
        <div className="bg-surface-container-low rounded-xl px-4 py-3 flex flex-col gap-0.5">
          <span className="text-xs text-on-surface-variant font-body uppercase tracking-wider">Recipients</span>
          <span className="text-sm font-semibold text-on-surface font-body">
            {wl.email_recipients.length}
          </span>
        </div>
      </div>

      {/* Keyword list */}
      {wl.watchlist_keywords.length > 0 && (
        <div>
          <h2 className="font-headline text-base font-semibold text-on-surface mb-3">Monitored Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {wl.watchlist_keywords.map((kw) => (
              <span
                key={kw.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/15 text-primary text-xs font-medium font-body"
              >
                {kw.keyword}
                <span className="text-primary/50 text-[10px]">{kw.match_mode}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Match Timeline */}
      <div>
        <h2 className="font-headline text-base font-semibold text-on-surface mb-4">Match History</h2>
        <MatchTimeline watchlistId={id} />
      </div>
    </div>
  );
}
