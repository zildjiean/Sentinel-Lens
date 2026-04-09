export default function WatchlistLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-lg bg-surface-container-high" />
          <div className="h-4 w-72 rounded bg-surface-container-high" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-surface-container-high" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-surface-container" />
        ))}
      </div>

      {/* Card skeletons */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 rounded-xl bg-surface-container-low border-l-4 border-l-surface-container-high" />
      ))}
    </div>
  );
}
