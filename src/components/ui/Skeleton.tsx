"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-container-high/60 ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-surface-container-low p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="rounded-2xl bg-surface-container-low p-6 space-y-6">
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="lg:col-span-7 space-y-3">
          <Skeleton className="h-3 w-24" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5">
              <Skeleton className="h-5 w-14 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonFeed() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <SkeletonHero />

      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Search */}
      <Skeleton className="h-11 w-full rounded-xl" />

      {/* Filters */}
      <div className="flex gap-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-full" />
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonArticleDetail() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="rounded-2xl bg-surface-container-low p-5 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export function SkeletonAnalytics() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-surface-container-low p-5 flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-surface-container-low p-5">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        <div className="rounded-2xl bg-surface-container-low p-5">
          <Skeleton className="h-4 w-36 mb-4" />
          <Skeleton className="h-40 w-40 mx-auto rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonSettings() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-56 flex lg:flex-col gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
        <div className="flex-1 rounded-2xl bg-surface-container-low p-5 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-2/3 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="rounded-2xl bg-surface-container-low p-5 space-y-0 divide-y divide-outline-variant/10">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-4">
            <Skeleton className="h-6 w-6 rounded" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
