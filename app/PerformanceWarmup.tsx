"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const PRIMARY_ROUTES = [
  "/practice",
  "/knowledge-vault",
  "/dashboard",
  "/feedback",
  "/interview",
  "/advanced",
  "/home"
];

export default function PerformanceWarmup({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;

    let cancelled = false;
    const timers: number[] = [];

    const run = () => {
      if (cancelled) return;

      // Warm the two canonical endpoints that back the heaviest workspaces.
      // Browser + Vercel CDN caching makes the later page request effectively free.
      fetch("/api/content?type=practice&view=summary", { cache: "default" }).catch(() => {});
      fetch("/api/quick-math?action=meta", { cache: "default" }).catch(() => {});

      // Our navigation uses buttons rather than <Link>, so Next.js does not
      // automatically prefetch these destinations. Staggering avoids a burst.
      PRIMARY_ROUTES.forEach((route, index) => {
        timers.push(window.setTimeout(() => {
          if (!cancelled) router.prefetch(route);
        }, index * 180));
      });
    };

    const w = window as Window & { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let idleId: number | null = null;
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(run, { timeout: 1200 });
    else timers.push(window.setTimeout(run, 450));

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      if (idleId !== null && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
    };
  }, [enabled, router]);

  return null;
}
