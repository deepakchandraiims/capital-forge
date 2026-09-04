"use client";

import { useEffect } from "react";

const APP_TABS = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const DIRECT_ROUTES: Record<string, string> = {
  Home: "/home",
  Dashboard: "/dashboard",
  Feedback: "/feedback"
};

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function detectTab(label: string) {
  const normalized = clean(label);
  return APP_TABS.find((item) => normalized === item || normalized.endsWith(item));
}

export default function NavRouteBridge() {
  useEffect(() => {
    const routeFor = (label: string) => DIRECT_ROUTES[label];

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button) return;

      const tab = detectTab(button.textContent || "");
      const route = tab ? routeFor(tab) : undefined;

      if (route && window.location.pathname !== route) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.assign(route);
      }
    };

    const enforceActiveRoute = () => {
      if (window.location.pathname !== "/") return;
      const active = document.querySelector(
        ".side-nav button.active, .pm-nav button.active, .dash-nav button.active, .feedback-nav button.active, .home-sidebar nav button.active"
      ) as HTMLButtonElement | null;
      if (!active) return;

      const tab = detectTab(active.textContent || "");
      const route = tab ? routeFor(tab) : undefined;
      if (route) window.location.replace(route);
    };

    document.addEventListener("click", handleClick, true);

    const observer = new MutationObserver(() => {
      window.setTimeout(enforceActiveRoute, 0);
    });
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    if (window.location.pathname === "/") {
      const open = new URLSearchParams(window.location.search).get("open");
      const direct = open ? routeFor(open) : undefined;

      if (direct) {
        window.location.replace(direct);
      } else if (open && APP_TABS.includes(open)) {
        window.setTimeout(() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          const match = buttons.find((button) => detectTab(button.textContent || "") === open);
          (match as HTMLButtonElement | undefined)?.click();
        }, 120);
      }
    }

    return () => {
      document.removeEventListener("click", handleClick, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
