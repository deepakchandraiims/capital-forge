"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function NavRouteBridge() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const input = document.querySelector(
          ".kv-global-search input, .home-search input, .dash-search input, .advx-header-search input, input[placeholder*='Search']"
        ) as HTMLInputElement | null;
        if (input) {
          event.preventDefault();
          input.focus();
          input.select();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    // Older screens used a global MutationObserver + 250ms interval to repeatedly
    // scan the entire DOM. All primary pages now own their navigation directly,
    // so only the two legacy convenience controls are added once per route mount.
    const timer = window.setTimeout(() => {
      if (pathname === "/practice" && !document.querySelector(".cf-qm-promo")) {
        const main = document.querySelector("main");
        const heading = main
          ? Array.from(main.querySelectorAll("h2")).find((node) =>
              (node.textContent || "").includes("Consistent Practice Creates")
            )
          : null;
        const hero = heading?.closest("section");
        if (hero?.parentElement) {
          if (!document.getElementById("cf-quick-math-practice-style")) {
            const style = document.createElement("style");
            style.id = "cf-quick-math-practice-style";
            style.textContent = `
              .cf-qm-promo{margin:0 0 14px;border:1px solid #cfe0fb;border-radius:14px;background:linear-gradient(115deg,#f8fbff 0%,#edf5ff 58%,#f9fbff 100%);padding:15px 18px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;box-shadow:0 7px 22px rgba(28,92,184,.08);width:100%;box-sizing:border-box}
              .cf-qm-copy{display:flex;gap:14px;align-items:center;min-width:0}.cf-qm-icon{width:50px;height:50px;flex:0 0 50px;border-radius:14px;background:linear-gradient(135deg,#126fff,#153fbe);display:grid;place-items:center;color:#fff;font-size:22px;font-weight:900;box-shadow:0 8px 20px rgba(25,91,213,.24)}
              .cf-qm-copy small{font-size:8px;letter-spacing:.13em;color:#1768e8;font-weight:900}.cf-qm-copy h3{font-size:16px;margin:3px 0;color:#15233a}.cf-qm-copy p{font-size:10px;line-height:1.45;color:#6e7b91;margin:0}.cf-qm-meta{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}.cf-qm-meta span{font-size:8px;font-weight:800;padding:4px 7px;border-radius:999px;background:#fff;border:1px solid #dbe6f3;color:#49617e}
              .cf-qm-actions{display:flex;align-items:center;gap:12px}.cf-qm-actions div{text-align:right}.cf-qm-actions b{display:block;font-size:17px;color:#14233c}.cf-qm-actions small{font-size:8px;color:#7a8799}.cf-qm-actions button{border:0;background:#176ef0;color:#fff;border-radius:10px;padding:12px 17px;font-size:9px;font-weight:900;cursor:pointer;white-space:nowrap;box-shadow:0 8px 18px rgba(23,110,240,.22)}
              @media(max-width:760px){.cf-qm-promo{grid-template-columns:1fr}.cf-qm-actions{justify-content:space-between}.cf-qm-actions div{text-align:left}}
            `;
            document.head.appendChild(style);
          }
          const card = document.createElement("section");
          card.className = "cf-qm-promo";
          card.innerHTML = `<div class="cf-qm-copy"><div class="cf-qm-icon">±</div><div><small>DEDICATED MENTAL SPEED TRAINING</small><h3>Quick Mathematics</h3><p>Train from number fluency through percentages, valuation, PE/IB math, leverage, IRR intuition, markets and modeling speed.</p><div class="cf-qm-meta"><span>10,000 validated questions</span><span>44 progressive levels</span><span>Difficulty 1–10</span></div></div></div><div class="cf-qm-actions"><div><b>Make numbers automatic.</b><small>Start a focused speed-and-accuracy sprint.</small></div><button type="button">Open Quick Math →</button></div>`;
          card.querySelector("button")?.addEventListener("click", () => router.push("/practice/quick-math"));
          hero.insertAdjacentElement("afterend", card);
        }
      }

      if (pathname === "/dashboard" && !document.querySelector(".kv-injected-dashboard-switch")) {
        const host = document.querySelector(".dash-left");
        if (host) {
          const wrap = document.createElement("div");
          wrap.className = "kv-dashboard-switch kv-injected-dashboard-switch";
          const practice = document.createElement("button");
          practice.className = "active";
          practice.textContent = "Practice & Skills";
          const vault = document.createElement("button");
          vault.textContent = "Knowledge Vault";
          vault.addEventListener("click", () => router.push("/dashboard/knowledge-vault"));
          wrap.append(practice, vault);
          host.prepend(wrap);
        }
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname, router]);

  return null;
}
