"use client";

import { useState } from "react";

type Result = Record<string, unknown> & { ok?: boolean; error?: string; readyToPublish?: number };

export default function ContentRemediateV2Page() {
  const [token, setToken] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    if (!token.trim() || !file) return;
    setBusy(true);
    setMessage("Running checksum-safe quality review and publication gate…");
    setResult(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/admin/content-quality-gate-v2", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-capital-forge-remediate": token.trim(),
        },
        body: text,
      });
      const data = (await res.json()) as Result;
      setResult(data);
      if (!res.ok || !data.ok) throw new Error(data.error || "Quality gate failed.");
      setMessage(data.readyToPublish === 605
        ? "Quality review complete: all 605 objects are ready for final publication. Nothing was published."
        : `Quality review complete. ${data.readyToPublish ?? 0} of 605 are ready for publication.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(token.trim() && file && !busy);

  return (
    <main style={{ minHeight:"100vh", background:"#f6f8fc", padding:36, color:"#101828", fontFamily:"Inter,ui-sans-serif,system-ui" }}>
      <div style={{ maxWidth:880, margin:"0 auto" }}>
        <div style={{ display:"inline-flex", borderRadius:999, background:"#eaf2ff", color:"#1457d9", padding:"7px 11px", fontWeight:800, fontSize:12 }}>CAPITAL FORGE CONTENT OS · STEP 3 V2</div>
        <h1 style={{ fontSize:38, margin:"14px 0 8px", letterSpacing:"-.04em" }}>Quality Review + Publication Gate</h1>
        <p style={{ color:"#667085", lineHeight:1.6 }}>Structural validation and deterministic calculation verification are already complete. This page only runs the 605-object qualitative review and publication gate. It does not publish content.</p>

        <section style={{ marginTop:24, background:"white", border:"1px solid #e4e7ec", borderRadius:22, padding:24 }}>
          <label style={{ display:"grid", gap:8, fontWeight:800 }}>
            Temporary review-pass token
            <input type="password" value={token} onChange={e=>setToken(e.target.value)} autoComplete="off" style={{ border:"1px solid #d0d5dd", borderRadius:14, padding:14 }} />
          </label>

          <label style={{ display:"grid", gap:8, fontWeight:800, marginTop:18 }}>
            605-object quality-review file
            <input type="file" accept="application/json,.json" onChange={e=>setFile(e.target.files?.[0]||null)} style={{ border:"1px solid #d0d5dd", borderRadius:14, padding:14, background:"white" }} />
            <small style={{ color:"#667085", fontWeight:500 }}>{file ? file.name : "Choose Capital_Forge_605_Quality_Reviews.json"}</small>
          </label>

          <button onClick={run} disabled={!ready} style={{ marginTop:18, width:"100%", border:0, borderRadius:14, padding:"14px 18px", background:ready?"#1769ff":"#cfd8e8", color:"white", fontWeight:900, cursor:ready?"pointer":"not-allowed" }}>
            {busy ? "Running quality gates…" : "Run 605 Quality Reviews & Gate →"}
          </button>
        </section>

        {message && <div style={{ marginTop:20, padding:16, borderRadius:16, background:result?.ok?"#ecfdf3":"#fff8eb", border:`1px solid ${result?.ok?"#abefc6":"#fedf89"}` }}>{message}</div>}
        {result && <section style={{ marginTop:20, background:"#101828", color:"#e6edf7", borderRadius:20, padding:20, overflow:"auto" }}><pre style={{ margin:0, whiteSpace:"pre-wrap", fontSize:12, lineHeight:1.5 }}>{JSON.stringify(result,null,2)}</pre></section>}

        <section style={{ marginTop:20, border:"1px solid #fecaca", background:"#fff7f7", borderRadius:18, padding:18 }}>
          <b style={{ color:"#b42318" }}>Publication lock remains active</b>
          <p style={{ color:"#667085", lineHeight:1.6, marginBottom:0 }}>This step inserts reviews and evaluates readiness only. Canonical publication is still a separate final action.</p>
        </section>
      </div>
    </main>
  );
}
