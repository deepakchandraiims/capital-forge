"use client";

import { useEffect } from "react";
import { PRIMARY_NAV, routeForNav } from "./navigation";

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function detectTab(label: string) {
  const normalized = clean(label);
  return PRIMARY_NAV.find((item) => normalized === item || normalized.endsWith(item));
}

function directRouteFor(label: string | null | undefined) {
  if (!label) return undefined;
  const tab = detectTab(label);
  return tab ? routeForNav(tab) : undefined;
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

    const ensureQuickMathStyles = () => {
      if (document.getElementById("cf-quick-math-practice-style")) return;
      const style = document.createElement("style");
      style.id = "cf-quick-math-practice-style";
      style.textContent = `
        .cf-qm-promo{margin:0 0 14px;border:1px solid #cfe0fb;border-radius:14px;background:linear-gradient(115deg,#f8fbff 0%,#edf5ff 58%,#f9fbff 100%);padding:15px 18px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;box-shadow:0 7px 22px rgba(28,92,184,.08);width:100%;box-sizing:border-box}
        .cf-qm-copy{display:flex;gap:14px;align-items:center;min-width:0}.cf-qm-icon{width:50px;height:50px;flex:0 0 50px;border-radius:14px;background:linear-gradient(135deg,#126fff,#153fbe);display:grid;place-items:center;color:#fff;font-size:22px;font-weight:900;box-shadow:0 8px 20px rgba(25,91,213,.24)}
        .cf-qm-copy small{font-size:8px;letter-spacing:.13em;color:#1768e8;font-weight:900}.cf-qm-copy h3{font-size:16px;margin:3px 0;color:#15233a}.cf-qm-copy p{font-size:10px;line-height:1.45;color:#6e7b91;margin:0}.cf-qm-meta{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}.cf-qm-meta span{font-size:8px;font-weight:800;padding:4px 7px;border-radius:999px;background:#fff;border:1px solid #dbe6f3;color:#49617e}
        .cf-qm-actions{display:flex;align-items:center;gap:12px}.cf-qm-actions div{text-align:right}.cf-qm-actions b{display:block;font-size:17px;color:#14233c}.cf-qm-actions small{font-size:8px;color:#7a8799}.cf-qm-actions button{border:0;background:#176ef0;color:#fff;border-radius:10px;padding:12px 17px;font-size:9px;font-weight:900;cursor:pointer;white-space:nowrap;box-shadow:0 8px 18px rgba(23,110,240,.22)}
        .cf-qm-actions button:hover{background:#0f61de;transform:translateY(-1px)}
        @media(max-width:760px){.cf-qm-promo{grid-template-columns:1fr}.cf-qm-actions{justify-content:space-between}.cf-qm-actions div{text-align:left}}
      `;
      document.head.appendChild(style);
    };

    const ensureQuickMathPracticeEntry = () => {
      if (window.location.pathname !== "/practice") return;
      if (document.querySelector(".cf-qm-promo")) return;

      const main = document.querySelector("main");
      if (!main) return;
      const heading = Array.from(main.querySelectorAll("h2")).find((node) => {
        const value = clean(node.textContent || "");
        return value.includes("Consistent Practice Creates") && value.includes("Extraordinary Results");
      });
      const hero = heading?.closest("section");
      if (!hero || !hero.parentElement) return;

      ensureQuickMathStyles();
      const card = document.createElement("section");
      card.className = "cf-qm-promo";
      card.setAttribute("aria-label", "Quick Mathematics");
      card.innerHTML = `<div class="cf-qm-copy"><div class="cf-qm-icon">±</div><div><small>DEDICATED MENTAL SPEED TRAINING</small><h3>Quick Mathematics</h3><p>Train from number fluency through percentages, valuation, PE/IB math, leverage, IRR intuition, markets, modeling speed and extreme mental calculation.</p><div class="cf-qm-meta"><span>10,000 validated questions</span><span>44 progressive levels</span><span>Difficulty 1–10</span><span>Tracks speed + accuracy</span></div></div></div><div class="cf-qm-actions"><div><b>Make numbers automatic.</b><small>Start with a 10, 25, 50 or 100-question sprint.</small></div><button type="button">Open Quick Math →</button></div>`;
      card.querySelector("button")?.addEventListener("click", () => navigate("/practice/quick-math"));
      hero.insertAdjacentElement("afterend", card);
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
      if (button.closest(".cf-qm-promo")) return;

      const route = directRouteFor(button.textContent || "");
      if (!route || window.location.pathname === route) return;
      event.preventDefault();
      event.stopPropagation();
      if ("stopImmediatePropagation" in event) (event as Event & { stopImmediatePropagation: () => void }).stopImmediatePropagation();
      navigate(route);
    };

    const enforceRootRoute = () => {
      ensureKnowledgeVaultNavigation();
      ensureQuickMathPracticeEntry();
      ensureDashboardSwitch();
      if (redirecting || window.location.pathname !== "/") return;
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
