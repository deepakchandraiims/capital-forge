"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import LiveDateTime from "../LiveDateTime";
import { PRIMARY_NAV, NAV_ICONS, routeForNav } from "../navigation";

const tabs=PRIMARY_NAV;
const icons=NAV_ICONS;

export default function KnowledgeVaultShell({ children, search, onSearch }: { children: ReactNode; search?: string; onSearch?: (value: string) => void }) {
  const router=useRouter();
  function go(tab:string){const route=routeForNav(tab);if(route)router.push(route);}
  return <div className="kv-app">
    <header className="kv-header">
      <button className="kv-brand" onClick={() => go("Home")}><span className="kv-brand-mark">CF</span><span><b>Capital Forge</b><small>Master Finance. Build Your Future.</small></span></button>
      <div className="kv-global-search"><span>⌕</span><input value={search ?? ""} onChange={(e) => onSearch?.(e.target.value)} placeholder="Search for topics, companies, trades, events or concepts..."/><kbd>⌘ K</kbd></div>
      <div className="kv-header-actions"><LiveDateTime compact/><button onClick={() => go("Advanced")} className="kv-ai">✦ AI Assistant</button><button className="kv-icon-btn" aria-label="Notifications">♧</button><div className="kv-profile"><span className="kv-avatar">DC</span><span><b>Deepak</b><small>Capital Forge</small></span><i>⌄</i></div></div>
    </header>
    <aside className="kv-sidebar"><nav>{tabs.map((tab) => <button key={tab} className={tab === "Knowledge Vault" ? "active" : ""} onClick={() => go(tab)}><span>{icons[tab]}</span>{tab}</button>)}</nav><div className="kv-sidebar-card"><b>Knowledge Vault</b><p>Financial memory, context and pattern recognition across 25 categories.</p><button onClick={() => router.push("/knowledge-vault/quick-scan")}>Start Quick Scan →</button></div><div className="kv-version">Capital Forge · CF3 Live<br/>3,000 canonical objects · progress tracked in real time.</div></aside>
    {children}
  </div>;
}
