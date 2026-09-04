"use client";

import { useEffect } from "react";

const APP_TABS = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"] as const;

const DIRECT_ROUTES: Record<string, string> = {
  Home: "/home",
  Dashboard: "/dashboard",
  Feedback: "/feedback",
  "Interview Room": "/interview"
};

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function detectTab(label: string) {
  const normalized = clean(label);
  return APP_TABS.find((item) => normalized === item || normalized.endsWith(item));
}

function directRouteFor(label: string | null | undefined) {
  if (!label) return undefined;
  const tab = detectTab(label);
  return tab ? DIRECT_ROUTES[tab] : undefined;
}

export default function NavRouteBridge() {
  useEffect(() => {
    let redirecting = false;

    const navigate = (route: string, replace = false) => {
      if (redirecting || window.location.pathname === route) return;
      redirecting = true;
      if (replace) window.location.replace(route);
      else window.location.assign(route);
    };

    const handleNavigationEvent = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button) return;

      const route = directRouteFor(button.textContent || "");
      if (!route || window.location.pathname === route) return;

      event.preventDefault();
      event.stopPropagation();
      if ("stopImmediatePropagation" in event) {
        (event as Event & { stopImmediatePropagation: () => void }).stopImmediatePropagation();
      }
      navigate(route);
    };

    const enforceRootRoute = () => {
      if (redirecting || window.location.pathname !== "/") return;

      const params = new URLSearchParams(window.location.search);
      const open = params.get("open");
      const queryRoute = open ? DIRECT_ROUTES[open] : undefined;
      if (queryRoute) {
        navigate(queryRoute, true);
        return;
      }

      const active = document.querySelector(
        ".side-nav button.active, .pm-nav button.active, .dash-nav button.active, .feedback-nav button.active, .home-sidebar nav button.active, .ir-sidebar nav button.active"
      ) as HTMLButtonElement | null;

      const activeRoute = active ? directRouteFor(active.textContent || "") : undefined;
      if (activeRoute) navigate(activeRoute, true);
    };

    document.addEventListener("pointerdown", handleNavigationEvent, true);
    document.addEventListener("click", handleNavigationEvent, true);

    const observer = new MutationObserver(() => {
      queueMicrotask(enforceRootRoute);
    });
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    const guard = window.setInterval(enforceRootRoute, 150);
    enforceRootRoute();

    return () => {
      document.removeEventListener("pointerdown", handleNavigationEvent, true);
      document.removeEventListener("click", handleNavigationEvent, true);
      observer.disconnect();
      window.clearInterval(guard);
    };
  }, []);

  return null;
}
