"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type UploadedPart = {
  part?: number;
  total_parts?: number;
  filename?: string;
  object_count?: number;
  staged_at?: string;
};

type StatusResult = {
  ok?: boolean;
  error?: string;
  exists?: boolean;
  batchId?: string;
  batchName?: string;
  status?: string;
  stagedObjects?: number;
  expectedTotal?: number | null;
  totalParts?: number | null;
  uploadedParts?: UploadedPart[];
  statusSummary?: Record<string, number>;
  deterministicSummary?: Record<string, number>;
};

export default function ContentImportStatusPage() {
  const [batchName, setBatchName] = useState("CF-V2-2000-20260905-001");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<StatusResult | null>(null);

  const ready = useMemo(() => Boolean(batchName.trim() && secret.trim() && !busy), [batchName, secret, busy]);

  async function refreshStatus() {
    if (!ready) return;
    setBusy(true);
    setMessage("Checking the private staging batch…");
    try {
      const response = await fetch("/api/admin/content-import/status", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-capital-forge-admin": secret.trim(),
        },
        body: JSON.stringify({ batchName: batchName.trim() }),
      });
      const raw = await response.text();
      let data: StatusResult;
      try {
        data = JSON.parse(raw) as StatusResult;
      } catch {
        throw new Error(`Status endpoint returned HTTP ${response.status}: ${raw.slice(0, 220)}`);
      }
      if (!response.ok || !data.ok) throw new Error(data.error || "Status check failed.");
      setResult(data);
      setMessage(data.exists ? "Batch status refreshed." : "This batch has not started yet.");
    } catch (error) {
      setResult(null);
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const expectedTotal = Number(result?.expectedTotal || 2000);
  const stagedObjects = Number(result?.stagedObjects || 0);
  const totalParts = Number(result?.totalParts || 20);
  const uploadedParts = (result?.uploadedParts || []).slice().sort((a, b) => Number(a.part || 0) - Number(b.part || 0));
  const uploadedPartNumbers = new Set(uploadedParts.map((p) => Number(p.part || 0)).filter(Boolean));
  const progress = expectedTotal > 0 ? Math.min(100, (stagedObjects / expectedTotal) * 100) : 0;

  return (
    <main style={{ minHeight: "100vh", background: "#f6f8fc", color: "#101828", padding: "36px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ display: "inline-flex", borderRadius: 999, background: "#eaf2ff", color: "#1457d9", padding: "7px 11px", fontWeight: 800, fontSize: 12 }}>CAPITAL FORGE CONTENT OS</div>
            <h1 style={{ margin: "14px 0 6px", fontSize: 38, letterSpacing: "-.04em" }}>Upload Status</h1>
            <p style={{ color: "#667085", lineHeight: 1.6, maxWidth: 760, margin: 0 }}>See which split files have reached private staging, how many objects are loaded, and whether validation has started.</p>
          </div>
          <Link href="/content-import" style={{ textDecoration: "none", border: "1px solid #d0d5dd", borderRadius: 12, padding: "10px 14px", background: "white", color: "#344054", fontWeight: 800 }}>← Import</Link>
        </div>

        <section style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 20, padding: 22, boxShadow: "0 18px 50px rgba(16,24,40,.05)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <label style={{ display: "grid", gap: 7, fontWeight: 800 }}>
              Import batch
              <input value={batchName} onChange={(e) => setBatchName(e.target.value)} style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 13 }} />
            </label>
            <label style={{ display: "grid", gap: 7, fontWeight: 800 }}>
              Admin secret
              <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 13 }} />
            </label>
            <button disabled={!ready} onClick={refreshStatus} style={{ border: 0, borderRadius: 12, padding: "13px 18px", background: ready ? "#1769ff" : "#cfd8e8", color: "white", fontWeight: 900, cursor: ready ? "pointer" : "not-allowed" }}>{busy ? "Refreshing…" : "Refresh status"}</button>
          </div>
        </section>

        {message && <div style={{ marginTop: 16, borderRadius: 14, padding: 14, background: "#fff8eb", border: "1px solid #fedf89", color: "#344054" }}>{message}</div>}

        <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }}>
          {[
            [stagedObjects.toLocaleString(), "Staged objects"],
            [expectedTotal.toLocaleString(), "Expected objects"],
            [uploadedPartNumbers.size.toString(), `Files uploaded / ${totalParts}`],
            [String(result?.status || "not_started"), "Batch status"],
          ].map(([value, label]) => (
            <div key={label} style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}>
              <b style={{ display: "block", fontSize: label === "Batch status" ? 20 : 28, color: "#1769ff", wordBreak: "break-word" }}>{value}</b>
              <span style={{ color: "#667085" }}>{label}</span>
            </div>
          ))}
        </section>

        <section style={{ marginTop: 18, background: "white", border: "1px solid #e4e7ec", borderRadius: 20, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><b>Overall progress</b><b>{progress.toFixed(1)}%</b></div>
          <div style={{ height: 12, background: "#e9eef6", borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${progress}%`, height: "100%", background: "#1769ff", transition: "width .2s ease" }} /></div>
        </section>

        <section style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>Split-file tracker</h2>
            <span style={{ color: "#667085", fontSize: 13 }}>Green = confirmed in batch metadata</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
            {Array.from({ length: totalParts }, (_, i) => i + 1).map((part) => {
              const uploaded = uploadedPartNumbers.has(part);
              const meta = uploadedParts.find((p) => Number(p.part) === part);
              return (
                <div key={part} style={{ border: `1px solid ${uploaded ? "#abefc6" : "#e4e7ec"}`, background: uploaded ? "#ecfdf3" : "white", borderRadius: 16, padding: 15 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b>Part {String(part).padStart(2, "0")}</b><span>{uploaded ? "✓" : "○"}</span></div>
                  <div style={{ marginTop: 7, color: uploaded ? "#067647" : "#667085", fontSize: 13, fontWeight: 700 }}>{uploaded ? "Uploaded" : "Not uploaded"}</div>
                  {meta?.filename && <div style={{ marginTop: 5, color: "#667085", fontSize: 11, wordBreak: "break-word" }}>{meta.filename}</div>}
                  {meta?.object_count != null && <div style={{ marginTop: 4, color: "#667085", fontSize: 11 }}>{meta.object_count} objects</div>}
                </div>
              );
            })}
          </div>
        </section>

        {result?.statusSummary && (
          <section style={{ marginTop: 18, background: "#101828", color: "#e6edf7", borderRadius: 20, padding: 20, overflow: "auto" }}>
            <h3 style={{ marginTop: 0 }}>Validation summary</h3>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13, lineHeight: 1.55 }}>{JSON.stringify({ statusSummary: result.statusSummary, deterministicSummary: result.deterministicSummary }, null, 2)}</pre>
          </section>
        )}
      </div>
    </main>
  );
}
