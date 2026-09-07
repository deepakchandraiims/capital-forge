"use client";

import { useRouter } from "next/navigation";
import { PRIMARY_NAV, NAV_ICONS, routeForNav, type PrimaryNavLabel } from "./navigation";

export default function SharedAppSidebar({active, title="Capital Forge", note="Institutional finance workstation"}:{active:PrimaryNavLabel;title?:string;note?:string}) {
  const router=useRouter();
  return <aside className="cf-shared-sidebar" aria-label="Capital Forge navigation">
    <nav>{PRIMARY_NAV.map(tab=>{const route=routeForNav(tab);return <button key={tab} className={tab===active?"active":""} aria-current={tab===active?"page":undefined} onClick={()=>{if(route)router.push(route)}}><span>{NAV_ICONS[tab]}</span>{tab}</button>})}</nav>
    <div className="cf-shared-sidebar-card"><b>{title}</b><p>{note}</p></div>
    <div className="cf-shared-sidebar-foot">Capital Forge · Shared Navigation</div>
  </aside>;
}
