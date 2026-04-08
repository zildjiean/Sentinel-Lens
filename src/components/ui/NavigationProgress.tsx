"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // When pathname changes, the navigation is complete
    setLoading(false);
    setProgress(100);
    const timer = setTimeout(() => setProgress(0), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Intercept link clicks to show progress bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href === pathname) return;
      setLoading(true);
      setProgress(30);
      // Animate progress
      const t1 = setTimeout(() => setProgress(60), 200);
      const t2 = setTimeout(() => setProgress(80), 600);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  if (progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5">
      <div
        className={`h-full bg-primary shadow-[0_0_8px_var(--color-primary)] transition-all ${
          loading ? "duration-1000 ease-out" : "duration-300 ease-in"
        }`}
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      />
    </div>
  );
}
