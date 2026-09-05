"use client";

import { useState } from "react";

type Result = Record<string, unknown> & { ok?: boolean; error?: string; remainingNeedsReview?: number };

export default function ContentRemediatePage() {
  const [token, setToken] = useState("");
  const [calcFile, setCalcFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"structural" | "calc" | null>(null);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function runStructural() {
    if (!token.trim()) return;
    setBusy("structural");
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
      setMessage(data.remainingNeedsReview === 0 ? "Structural remediation complete: all 605 objects now pass structural validation." : `Structural remediation completed. ${data.remainingNeedsReview} items still need targeted review.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function runCalcVerification() {
    if (!token.trim() || !calcFile) return;
    setBusy("calc");
    setMessage("Applying the checksum-locked deterministic verification manifest to 204 calculation objects…");
    setResult(null);
    try {
      const text = await calcFile.text();
      const res = await fetch("/api/admin/content-calc-verify-v1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-capital-forge-remediate": token.trim(),
        },
        body: text,
      });
      const data = (await res.json()) as Result;
      setResult(data);
      if (!res.ok || !data.ok) throw new Error(data.error || "Calculation verification failed");
      setMessage("Deterministic verification applied to all 204 calculation-oriented objects. Nothing was published.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={{ minHeight:"100vh", background:"#f6f8fc", padding:36, fontFamily:"Inter,ui-sans-serif,system-ui", color:"#101828" }}>
      <div style={{ maxWidth:900, margin:"0 auto" }}>
        <div style={{ display:"inline-flex", borderRadius:999, background:"#eaf2ff", color:"#1457d9", padding:"7px 11px", fontWeight:800, fontSize:12 }}>CAPITAL FORGE CONTENT OS</div>
        <h1 style={{ fontSize:38, margin:"14px 0 8px", letterSpacing:"-.04em" }}>Content Review Pass</h1>
        <p style={{ color:"#667085", lineHeight:1.6 }}>Complete the two pre-publication checks for the 605-object import. Step 1 repairs structural validation issues. Step 2 applies the independently generated, checksum-locked arithmetic verification manifest to the 204 calculation-oriented objects. Neither step publishes content.</p>

        <section style={{ marginTop:24, background:"white", border:"1px solid #e4e7ec", borderRadius:22, padding:24 }}>
          <label style={{ display:"grid", gap:8, fontWeight:800 }}>
            Temporary review-pass token
            <input type="password" value={token} onChange={e=>setToken(e.target.value)} autoComplete="off" style={{ border:"1px solid #d0d5dd", borderRadius:14, padding:14 }} />
          </label>
        </section>

        <section style={{ marginTop:18, background:"white", border:"1px solid #e4e7ec", borderRadius:22, padding:24 }}>
          <div style={{ fontWeight:900, fontSize:18 }}>Step 1 · Structural remediation</div>
          <p style={{ color:"#667085", lineHeight:1.6 }}>Repairs structurally incomplete staged questions, including missing True/False option arrays, and re-runs the existing Supabase batch validator.</p>
          <button onClick={runStructural} disabled={!token.trim() || busy!==null} style={{ width:"100%", border:0, borderRadius:14, padding:"14px 18px", background:!token.trim() || busy!==null ? "#cfd8e8" : "#1769ff", color:"white", fontWeight:900 }}>{busy==="structural" ? "Running structural remediation…" : "1. Remediate & Revalidate 605 Objects →"}</button>
        </section>

        <section style={{ marginTop:18, background:"white", border:"1px solid #e4e7ec", borderRadius:22, padding:24 }}>
          <div style={{ fontWeight:900, fontSize:18 }}>Step 2 · Verify 204 calculations</div>
          <p style={{ color:"#667085", lineHeight:1.6 }}>Upload the exact Capital Forge 204-object verification manifest. The server checks the file SHA-256 and each question/answer evidence hash before changing any deterministic status.</p>
          <input type="file" accept="application/json,.json" onChange={e=>setCalcFile(e.target.files?.[0]||null)} style={{ width:"100%", border:"1px solid #d0d5dd", borderRadius:14, padding:14, background:"#fff" }} />
          <small style={{ display:"block", marginTop:7, color:"#667085" }}>{calcFile ? `${calcFile.name} · ${(calcFile.size/1024).toFixed(1)} KB` : "Choose capital_forge_calculation_verification_204.json"}</small>
          <button onClick={runCalcVerification} disabled={!token.trim() || !calcFile || busy!==null} style={{ marginTop:16, width:"100%", border:0, borderRadius:14, padding:"14px 18px", background:!token.trim() || !calcFile || busy!==null ? "#cfd8e8" : "#1769ff", color:"white", fontWeight:900 }}>{busy==="calc" ? "Verifying 204 calculations…" : "2. Apply Deterministic Verification →"}</button>
        </section>

        {message && <div style={{ marginTop:20, padding:16, borderRadius:16, background:result?.ok ? "#ecfdf3" : "#fff8eb", border:`1px solid ${result?.ok ? "#abefc6" : "#fedf89"}` }}>{message}</div>}
        {result && <section style={{ marginTop:20, background:"#101828", color:"#e6edf7", borderRadius:20, padding:20, overflow:"auto" }}><pre style={{ margin:0, whiteSpace:"pre-wrap", fontSize:12, lineHeight:1.5 }}>{JSON.stringify(result,null,2)}</pre></section>}

        <section style={{ marginTop:20, border:"1px solid #fecaca", background:"#fff7f7", borderRadius:18, padding:18 }}>
          <b style={{ color:"#b42318" }}>Publication lock remains active</b>
          <p style={{ color:"#667085", lineHeight:1.6, marginBottom:0 }}>These actions only remediate and verify staging content. The 605 objects remain unpublished until qualitative review and the publication gate are completed.</p>
        </section>
      </div>
    </main>
  );
}
