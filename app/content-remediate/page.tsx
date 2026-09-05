"use client";

import { useState } from "react";

type Result = Record<string, unknown> & { ok?: boolean; error?: string; remainingNeedsReview?: number };

export default function ContentRemediatePage() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    if (!token.trim()) return;
    setBusy(true);
    setMessage("Remediating structural review items and re-running the validator…");
    setResult(null);
    try {
      const res = await fetch("/api/admin/content-remediate-v1", {
        method: "POST",
        headers: { "x-capital-forge-remediate": token.trim() },
      });
      const data = (await res.json()) as Result;
      setResult(data);
      if (!res.ok || !data.ok) throw new Error(data.error || "Remediation failed");
      setMessage(data.remainingNeedsReview === 0 ? "Structural remediation complete: all 605 objects now pass structural validation." : `Remediation completed. ${data.remainingNeedsReview} items still need targeted review.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight:"100vh", background:"#f6f8fc", padding:36, fontFamily:"Inter,ui-sans-serif,system-ui", color:"#101828" }}>
      <div style={{ maxWidth:900, margin:"0 auto" }}>
        <div style={{ display:"inline-flex", borderRadius:999, background:"#eaf2ff", color:"#1457d9", padding:"7px 11px", fontWeight:800, fontSize:12 }}>CAPITAL FORGE CONTENT OS</div>
        <h1 style={{ fontSize:38, margin:"14px 0 8px", letterSpacing:"-.04em" }}>Structural Remediation</h1>
        <p style={{ color:"#667085", lineHeight:1.6 }}>This one-time tool repairs structurally incomplete staged questions, re-runs the existing Supabase validator, and reports anything that still needs review. It does not publish content and does not mark calculation items as deterministically verified.</p>
        <section style={{ marginTop:24, background:"white", border:"1px solid #e4e7ec", borderRadius:22, padding:24 }}>
          <label style={{ display:"grid", gap:8, fontWeight:800 }}>
            Temporary remediation token
            <input type="password" value={token} onChange={e=>setToken(e.target.value)} autoComplete="off" style={{ border:"1px solid #d0d5dd", borderRadius:14, padding:14 }} />
          </label>
          <button onClick={run} disabled={!token.trim() || busy} style={{ marginTop:18, width:"100%", border:0, borderRadius:14, padding:"14px 18px", background:!token.trim() || busy ? "#cfd8e8" : "#1769ff", color:"white", fontWeight:900 }}>{busy ? "Running remediation…" : "Remediate & Revalidate 605 Objects →"}</button>
        </section>
        {message && <div style={{ marginTop:20, padding:16, borderRadius:16, background:result?.ok ? "#ecfdf3" : "#fff8eb", border:`1px solid ${result?.ok ? "#abefc6" : "#fedf89"}` }}>{message}</div>}
        {result && <section style={{ marginTop:20, background:"#101828", color:"#e6edf7", borderRadius:20, padding:20, overflow:"auto" }}><pre style={{ margin:0, whiteSpace:"pre-wrap", fontSize:12, lineHeight:1.5 }}>{JSON.stringify(result,null,2)}</pre></section>}
      </div>
    </main>
  );
}
