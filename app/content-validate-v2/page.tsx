"use client";

import { useState } from "react";

type ValidationResult = {
  ok?: boolean;
  error?: string;
  batchId?: string;
  batchName?: string;
  batchStatus?: string;
  stagedObjects?: number;
  validationCalled?: boolean;
  validationMessage?: string;
  rpcErrors?: Array<{ parameter: string; message: string }>;
  summary?: {
    byValidation?: Record<string, number>;
    byDeterministic?: Record<string, number>;
    byTypeValidation?: Record<string, number>;
  };
  invalidSamples?: Array<{ source_record_key: string; content_type: string | null; validation_status: string | null }>;
  published?: number;
  nextStep?: string;
  note?: string;
};

const DEFAULT_BATCH_ID = "e59a7c54-c0c4-45dd-a396-1266f31ec50a";
const DEFAULT_BATCH_NAME = "CF-V2-2000-20260905-001";

export default function ContentValidateV2Page() {
  const [secret, setSecret] = useState("");
  const [batchId, setBatchId] = useState(DEFAULT_BATCH_ID);
  const [batchName, setBatchName] = useState(DEFAULT_BATCH_NAME);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("The 2,000-object batch is staged. This page runs structural validation only; it does not publish anything.");
  const [result, setResult] = useState<ValidationResult | null>(null);

  async function runValidation() {
    if (!secret.trim()) return;
    setBusy(true);
    setResult(null);
    setMessage("Running structural validation across the staged 2,000-object batch…");
    try {
      const response = await fetch("/api/admin/content-validate-v2", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-capital-forge-admin": secret.trim(),
        },
        body: JSON.stringify({ batchId: batchId.trim(), batchName: batchName.trim() }),
      });
      const raw = await response.text();
      let data: ValidationResult;
      try {
        data = JSON.parse(raw) as ValidationResult;
      } catch {
        throw new Error(`Validation endpoint returned HTTP ${response.status}: ${raw.replace(/\s+/g, " ").slice(0, 300)}`);
      }
      setResult(data);
      if (!response.ok || !data.ok) throw new Error(data.error || data.validationMessage || "Validation failed.");
      setMessage("Structural validation finished. Review the result below. Nothing was published.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const validated = result?.summary?.byValidation || {};
  const deterministic = result?.summary?.byDeterministic || {};

  return (
    <main style={{ minHeight: "100vh", background: "#f6f8fc", padding: 36, color: "#101828", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "inline-flex", borderRadius: 999, background: "#eaf2ff", color: "#1457d9", padding: "7px 11px", fontWeight: 800, fontSize: 12 }}>CAPITAL FORGE CONTENT OS · V2</div>
          <h1 style={{ margin: "14px 0 6px", fontSize: 38, letterSpacing: "-.04em" }}>Structural Validation</h1>
          <p style={{ color: "#667085", lineHeight: 1.6, maxWidth: 820 }}>Validate the staged 2,000-object expansion batch using Capital Forge's database validator. This step does not run publication and does not bypass the deterministic or qualitative gates.</p>
        </div>

        <section style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 22, padding: 24, boxShadow: "0 18px 50px rgba(16,24,40,.06)" }}>
          <div style={{ display: "grid", gap: 16 }}>
            <label style={{ display: "grid", gap: 7, fontWeight: 800 }}>Batch name<input value={batchName} onChange={(e) => setBatchName(e.target.value)} style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 13 }} /></label>
            <label style={{ display: "grid", gap: 7, fontWeight: 800 }}>Batch ID<input value={batchId} onChange={(e) => setBatchId(e.target.value)} style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 13, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} /></label>
            <label style={{ display: "grid", gap: 7, fontWeight: 800 }}>Capital Forge admin secret<input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="CAPITAL_FORGE_ADMIN_SECRET" autoComplete="off" style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 13 }} /></label>
            <button onClick={runValidation} disabled={!secret.trim() || busy} style={{ border: 0, borderRadius: 14, padding: "14px 18px", fontWeight: 900, background: !secret.trim() || busy ? "#cfd8e8" : "#1769ff", color: "white", cursor: !secret.trim() || busy ? "not-allowed" : "pointer" }}>{busy ? "Validating 2,000 Objects…" : "Run Structural Validation →"}</button>
          </div>
        </section>

        <div style={{ marginTop: 18, borderRadius: 16, padding: 16, background: result?.ok ? "#ecfdf3" : "#fff8eb", border: `1px solid ${result?.ok ? "#abefc6" : "#fedf89"}`, color: "#344054" }}>{message}</div>

        <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
          {[
            [String(result?.stagedObjects ?? 2000), "Staged objects"],
            [String(Object.values(validated).reduce((a, b) => a + b, 0)), "Validation-status rows"],
            [String(Object.values(deterministic).reduce((a, b) => a + b, 0)), "Deterministic-status rows"],
            [String(result?.published ?? 0), "Published"],
          ].map(([value, label]) => <div key={label} style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}><b style={{ display: "block", fontSize: 27, color: "#1769ff" }}>{value}</b><span style={{ color: "#667085" }}>{label}</span></div>)}
        </section>

        {result && <section style={{ marginTop: 18, background: "#101828", color: "#e6edf7", borderRadius: 20, padding: 20, overflow: "auto" }}><pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.55 }}>{JSON.stringify(result, null, 2)}</pre></section>}

        <section style={{ marginTop: 18, border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 18, padding: 18 }}><b style={{ color: "#b42318" }}>Safety rule</b><p style={{ color: "#667085", lineHeight: 1.6, marginBottom: 0 }}>This page can only run the database structural validator for the selected batch. It does not publish, mark calculations as passed, or override any quality gate.</p></section>
      </div>
    </main>
  );
}
