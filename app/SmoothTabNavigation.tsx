"use client";

import { startTransition, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PRIMARY_NAV, routeForNav } from "./navigation";

type ViewTransition = { finished: Promise<void> };
type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => ViewTransition;
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function routeFromTarget(target: EventTarget | null) {
  const element = target instanceof Element ? target : null;
  const button = element?.closest("nav button") as HTMLButtonElement | null;
  if (!button) return null;
  const label = clean(button.textContent || "");
  const tab = PRIMARY_NAV.find((name) => label === name || label.endsWith(name));
  if (!tab) return null;
  const route = routeForNav(tab);
  return route ? { route, button } : null;
}

export default function SmoothTabNavigation({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const resolveNavigation = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    resolveNavigation.current?.();
    resolveNavigation.current = null;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    document.documentElement.classList.remove("cf-route-pending");
  }, [pathname]);

  useEffect(() => {
    if (!enabled) return;

    const prefetch = (event: Event) => {
      const match = routeFromTarget(event.target);
      if (!match || match.route === pathname) return;
      router.prefetch(match.route);
    };

    const navigate = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const match = routeFromTarget(event.target);
      if (!match || match.route === pathname) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();

      const runNavigation = () => new Promise<void>((resolve) => {
        resolveNavigation.current = resolve;
        document.documentElement.classList.add("cf-route-pending");
        startTransition(() => router.push(match.route, { scroll: false }));
        timeoutRef.current = window.setTimeout(() => {
          resolveNavigation.current?.();
          resolveNavigation.current = null;
          document.documentElement.classList.remove("cf-route-pending");
        }, 1200);
      });

      const doc = document as ViewTransitionDocument;
      if (typeof doc.startViewTransition === "function") {
        try {
          doc.startViewTransition(runNavigation);
          return;
        } catch {
          // Fall through to the normal App Router transition.
        }
      }
      void runNavigation();
    };

    document.addEventListener("pointerover", prefetch, true);
    document.addEventListener("focusin", prefetch, true);
    document.addEventListener("click", navigate, true);

    return () => {
      document.removeEventListener("pointerover", prefetch, true);
      document.removeEventListener("focusin", prefetch, true);
      document.removeEventListener("click", navigate, true);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [enabled, pathname, router]);

  return null;
}
