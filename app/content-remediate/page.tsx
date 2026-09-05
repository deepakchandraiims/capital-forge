"use client";

import { useState } from "react";

type Result = Record<string, unknown> & { ok?: boolean; error?: string; remainingNeedsReview?: number; readyToPublish?: number };
type Busy = "structural" | "calc" | "quality" | null;

export default function ContentRemediatePage() {
  const [token, setToken] = useState("");
  const [calcFile, setCalcFile] = useState<File | null>(null);
  const [qualityFile, setQualityFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function runStructural() {
    if (!token.trim()) return;
    setBusy("structural"); setMessage("Remediating structural review items and re-running the validator…"); setResult(null);
    try {
      const res = await fetch("/api/admin/content-remediate-v1", { method:"POST", headers:{"x-capital-forge-remediate":token.trim()} });
      const data=(await res.json()) as Result; setResult(data);
      if(!res.ok||!data.ok) throw new Error(data.error||"Remediation failed");
      setMessage(data.remainingNeedsReview===0?"Structural remediation complete: all 605 objects now pass structural validation.":`Structural remediation completed. ${data.remainingNeedsReview} items still need targeted review.`);
    } catch(e){ setMessage(e instanceof Error?e.message:String(e)); } finally{ setBusy(null); }
  }

  async function runCalcVerification() {
    if(!token.trim()||!calcFile)return;
    setBusy("calc"); setMessage("Applying the checksum-locked deterministic verification manifest to 204 calculation objects…"); setResult(null);
    try{
      const text=await calcFile.text();
      const res=await fetch("/api/admin/content-calc-verify-v1",{method:"POST",headers:{"content-type":"application/json","x-capital-forge-remediate":token.trim()},body:text});
      const data=(await res.json()) as Result; setResult(data);
      if(!res.ok||!data.ok)throw new Error(data.error||"Calculation verification failed");
      setMessage("Deterministic verification applied to all 204 calculation-oriented objects. Nothing was published.");
    }catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(null);}
  }

  async function runQualityGate(){
    if(!token.trim()||!qualityFile)return;
    setBusy("quality"); setMessage("Ingesting 605 qualitative reviews and running the publication gate…"); setResult(null);
    try{
      const text=await qualityFile.text();
      const res=await fetch("/api/admin/content-quality-gate-v1",{method:"POST",headers:{"content-type":"application/json","x-capital-forge-remediate":token.trim()},body:text});
      const data=(await res.json()) as Result; setResult(data);
      if(!res.ok||!data.ok)throw new Error(data.error||"Quality gate failed");
      setMessage(data.readyToPublish===605?"Quality review complete: all 605 objects are ready for the final publication step.":`Quality review complete. ${data.readyToPublish??0} of 605 are ready for publication.`);
    }catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(null);}
  }

  const btn=(enabled:boolean)=>({width:"100%",border:0,borderRadius:14,padding:"14px 18px",background:enabled?"#1769ff":"#cfd8e8",color:"white",fontWeight:900,cursor:enabled?"pointer":"not-allowed"} as const);

  return <main style={{minHeight:"100vh",background:"#f6f8fc",padding:36,fontFamily:"Inter,ui-sans-serif,system-ui",color:"#101828"}}>
    <div style={{maxWidth:900,margin:"0 auto"}}>
      <div style={{display:"inline-flex",borderRadius:999,background:"#eaf2ff",color:"#1457d9",padding:"7px 11px",fontWeight:800,fontSize:12}}>CAPITAL FORGE CONTENT OS</div>
      <h1 style={{fontSize:38,margin:"14px 0 8px",letterSpacing:"-.04em"}}>605-Object Review Pass</h1>
      <p style={{color:"#667085",lineHeight:1.6}}>Run these three pre-publication checks in order. None of these buttons publishes content.</p>

      <section style={{marginTop:24,background:"white",border:"1px solid #e4e7ec",borderRadius:22,padding:24}}>
        <label style={{display:"grid",gap:8,fontWeight:800}}>Temporary review-pass token
          <input type="password" value={token} onChange={e=>setToken(e.target.value)} autoComplete="off" style={{border:"1px solid #d0d5dd",borderRadius:14,padding:14}} />
        </label>
      </section>

      <section style={{marginTop:18,background:"white",border:"1px solid #e4e7ec",borderRadius:22,padding:24}}>
        <div style={{fontWeight:900,fontSize:18}}>Step 1 · Structural remediation</div>
        <p style={{color:"#667085",lineHeight:1.6}}>Repairs structurally flagged items where possible and re-runs the existing Supabase validator.</p>
        <button onClick={runStructural} disabled={!token.trim()||busy!==null} style={btn(Boolean(token.trim())&&busy===null)}>{busy==="structural"?"Running…":"1. Remediate & Revalidate →"}</button>
      </section>

      <section style={{marginTop:18,background:"white",border:"1px solid #e4e7ec",borderRadius:22,padding:24}}>
        <div style={{fontWeight:900,fontSize:18}}>Step 2 · Verify 204 calculations</div>
        <p style={{color:"#667085",lineHeight:1.6}}>Upload the exact checksum-locked calculation verification file.</p>
        <input type="file" accept="application/json,.json" onChange={e=>setCalcFile(e.target.files?.[0]||null)} style={{width:"100%",border:"1px solid #d0d5dd",borderRadius:14,padding:14,background:"#fff"}} />
        <small style={{display:"block",margin:"7px 0 16px",color:"#667085"}}>{calcFile?calcFile.name:"Choose Capital_Forge_204_Calculation_Verification.json"}</small>
        <button onClick={runCalcVerification} disabled={!token.trim()||!calcFile||busy!==null} style={btn(Boolean(token.trim()&&calcFile)&&busy===null)}>{busy==="calc"?"Verifying…":"2. Apply Deterministic Verification →"}</button>
      </section>

      <section style={{marginTop:18,background:"white",border:"1px solid #e4e7ec",borderRadius:22,padding:24}}>
        <div style={{fontWeight:900,fontSize:18}}>Step 3 · Qualitative review + publication gate</div>
        <p style={{color:"#667085",lineHeight:1.6}}>Upload the exact checksum-locked 605-object quality-review file. This inserts reviewer scores and evaluates the gate, but does not publish.</p>
        <input type="file" accept="application/json,.json" onChange={e=>setQualityFile(e.target.files?.[0]||null)} style={{width:"100%",border:"1px solid #d0d5dd",borderRadius:14,padding:14,background:"#fff"}} />
        <small style={{display:"block",margin:"7px 0 16px",color:"#667085"}}>{qualityFile?qualityFile.name:"Choose Capital_Forge_605_Quality_Reviews.json"}</small>
        <button onClick={runQualityGate} disabled={!token.trim()||!qualityFile||busy!==null} style={btn(Boolean(token.trim()&&qualityFile)&&busy===null)}>{busy==="quality"?"Running quality gates…":"3. Run Quality Review & Gate →"}</button>
      </section>

      {message&&<div style={{marginTop:20,padding:16,borderRadius:16,background:result?.ok?"#ecfdf3":"#fff8eb",border:`1px solid ${result?.ok?"#abefc6":"#fedf89"}`}}>{message}</div>}
      {result&&<section style={{marginTop:20,background:"#101828",color:"#e6edf7",borderRadius:20,padding:20,overflow:"auto"}}><pre style={{margin:0,whiteSpace:"pre-wrap",fontSize:12,lineHeight:1.5}}>{JSON.stringify(result,null,2)}</pre></section>}

      <section style={{marginTop:20,border:"1px solid #fecaca",background:"#fff7f7",borderRadius:18,padding:18}}><b style={{color:"#b42318"}}>Publication lock remains active</b><p style={{color:"#667085",lineHeight:1.6,marginBottom:0}}>After Step 3, send me the result. I will only move to canonical publication after the gate confirms the batch is ready.</p></section>
    </div>
  </main>;
}
