"use client";

import { useEffect } from "react";

const APP_TABS = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];

export default function NavRouteBridge() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button) return;
      const label = (button.textContent || "").replace(/\s+/g, " ").trim();
      const tab = APP_TABS.find((item) => label === item || label.endsWith(` ${item}`));
      if (tab === "Dashboard" && window.location.pathname !== "/dashboard") {
        event.preventDefault();
        event.stopPropagation();
        window.location.assign("/dashboard");
      }
    };

    document.addEventListener("click", handleClick, true);

    if (window.location.pathname === "/") {
      const open = new URLSearchParams(window.location.search).get("open");
      if (open && APP_TABS.includes(open)) {
        window.setTimeout(() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          const match = buttons.find((button) => (button.textContent || "").replace(/\s+/g, " ").trim().endsWith(open));
          match?.click();
        }, 120);
      }
    }

    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
