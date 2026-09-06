"use client";

import { useEffect, useState } from "react";

export default function LiveDateTime({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) return <span aria-label="Live date and time">Live</span>;
  const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString(undefined, compact ? { day: "2-digit", month: "short" } : { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  return <span aria-label={`Live date and time ${date} ${time}`} style={{display:"inline-flex",alignItems:"center",gap:8,whiteSpace:"nowrap",fontSize:11,fontWeight:700,color:"#536179"}}><i style={{width:7,height:7,borderRadius:"50%",background:"#18b981",boxShadow:"0 0 0 3px rgba(24,185,129,.12)"}}/><span>{date}</span><b style={{color:"#172033",fontVariantNumeric:"tabular-nums"}}>{time}</b></span>;
}
