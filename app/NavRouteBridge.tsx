"use client";

import { useEffect } from "react";

const APP_TABS = ["Home", "Knowledge Vault", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"] as const;

const DIRECT_ROUTES: Record<string, string> = {
  Home: "/home",
  "Knowledge Vault": "/knowledge-vault",
  Practice: "/practice",
  Advanced: "/advanced",
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

    const ensureKnowledgeVaultNavigation = () => {
      document.querySelectorAll("nav").forEach((nav) => {
        const buttons = Array.from(nav.querySelectorAll(":scope > button")) as HTMLButtonElement[];
        if (buttons.length < 4) return;
        const labels = buttons.map((b) => clean(b.textContent || ""));
        const hasHome = labels.some((x) => x === "Home" || x.endsWith("Home"));
        const hasPractice = labels.some((x) => x === "Practice" || x.endsWith("Practice"));
        if (!hasHome || !hasPractice) return;
        if (labels.some((x) => x === "Knowledge Vault" || x.endsWith("Knowledge Vault"))) return;

        const homeIndex = labels.findIndex((x) => x === "Home" || x.endsWith("Home"));
        const insertBefore = buttons[homeIndex + 1] || buttons[1] || null;
        const template = buttons.find((b) => !String(b.className || "").toLowerCase().includes("active")) || buttons[0];
        const button = template.cloneNode(false) as HTMLButtonElement;
        button.removeAttribute("aria-current");
        button.className = String(button.className || "").split(" ").filter((x) => !x.toLowerCase().includes("active")).join(" ");
        button.dataset.kvInjected = "1";
        const icon = document.createElement("span");
        icon.textContent = "◇";
        button.append(icon, document.createTextNode("Knowledge Vault"));
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          navigate("/knowledge-vault");
        });
        nav.insertBefore(button, insertBefore);
      });
    };

    const ensureDashboardSwitch = () => {
      if (window.location.pathname !== "/dashboard") return;
      if (document.querySelector(".kv-injected-dashboard-switch")) return;
      const host = document.querySelector(".dash-left");
      if (!host) return;
      const wrap = document.createElement("div");
      wrap.className = "kv-dashboard-switch kv-injected-dashboard-switch";
      const practice = document.createElement("button");
      practice.className = "active";
      practice.textContent = "Practice & Skills";
      practice.addEventListener("click", () => navigate("/dashboard"));
      const vault = document.createElement("button");
      vault.textContent = "Knowledge Vault";
      vault.addEventListener("click", () => navigate("/dashboard/knowledge-vault"));
      wrap.append(practice, vault);
      host.prepend(wrap);
    };

    const handleNavigationEvent = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button) return;

      if (button.closest(".kv-dashboard-switch, .kv-injected-dashboard-switch")) return;

      const route = directRouteFor(button.textContent || "");
      if (!route || window.location.pathname === route) return;
      event.preventDefault();
      event.stopPropagation();
      if ("stopImmediatePropagation" in event) (event as Event & { stopImmediatePropagation: () => void }).stopImmediatePropagation();
      navigate(route);
    };

    const enforceRootRoute = () => {
      ensureKnowledgeVaultNavigation();
      ensureDashboardSwitch();
      if (redirecting || window.location.pathname !== "/") return;
      const params = new URLSearchParams(window.location.search);
      const open = params.get("open");
      const queryRoute = open ? DIRECT_ROUTES[open] : undefined;
      if (queryRoute) { navigate(queryRoute, true); return; }
      const active = document.querySelector(".side-nav button.active, .pm-nav button.active, .dash-nav button.active, .feedback-nav button.active, .home-sidebar nav button.active, .ir-sidebar nav button.active") as HTMLButtonElement | null;
      const activeRoute = active ? directRouteFor(active.textContent || "") : undefined;
      if (activeRoute) navigate(activeRoute, true);
    };

    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const input = document.querySelector(".kv-global-search input, .home-search input, .dash-search input, .advx-header-search input, input[placeholder*='Search']") as HTMLInputElement | null;
        if (input) { event.preventDefault(); input.focus(); input.select(); }
      }
    };

    document.addEventListener("pointerdown", handleNavigationEvent, true);
    document.addEventListener("click", handleNavigationEvent, true);
    window.addEventListener("keydown", handleKey);
    const observer = new MutationObserver(() => queueMicrotask(enforceRootRoute));
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    const guard = window.setInterval(enforceRootRoute, 250);
    enforceRootRoute();

    return () => {
      document.removeEventListener("pointerdown", handleNavigationEvent, true);
      document.removeEventListener("click", handleNavigationEvent, true);
      window.removeEventListener("keydown", handleKey);
      observer.disconnect();
      window.clearInterval(guard);
    };
  }, []);

  return null;
}