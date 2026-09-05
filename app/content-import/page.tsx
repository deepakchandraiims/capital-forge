"use client";

import { useMemo, useState } from "react";

type ImportResult = {
  ok?: boolean;
  error?: string;
  batchName?: string;
  batchId?: string;
  sourceObjects?: number;
  existingKeysSkipped?: number;
  inserted?: number;
  stagedObjectsInBatch?: number;
  validationCalled?: boolean;
  validationMessage?: string;
  statusSummary?: Record<string, number>;
  published?: number;
  note?: string;
};

export default function ContentImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [secret, setSecret] = useState("");
  const [batchName, setBatchName] = useState("CF-FULL-EXPORT-20260905-001");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const ready = useMemo(() => Boolean(file && secret.trim() && !busy), [file, secret, busy]);

  async function runImport() {
    if (!file || !secret.trim()) return;
    setBusy(true);
    setMessage("Reading private manifest locally…");
    setResult(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const rows = Array.isArray(payload) ? payload : payload?.objects;
      if (!Array.isArray(rows) || rows.length !== 605) {
        throw new Error(`This importer requires the complete 605-object manifest. Found ${Array.isArray(rows) ? rows.length : 0}.`);
      }
      setMessage("Uploading 605 normalized objects to the private staging pipeline…");
      const response = await fetch("/api/admin/content-import", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-capital-forge-admin": secret.trim(),
        },
        body: JSON.stringify({ batchName: batchName.trim() || "CF-FULL-EXPORT-20260905-001", payload }),
      });
      const data = (await response.json()) as ImportResult;
      setResult(data);
      if (!response.ok || !data.ok) throw new Error(data.error || "Import failed.");
      setMessage("Import finished. Review the staging summary below; nothing was auto-published.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f6f8fc", padding: "36px", color: "#101828", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "inline-flex", borderRadius: 999, background: "#eaf2ff", color: "#1457d9", padding: "7px 11px", fontWeight: 800, fontSize: 12 }}>CAPITAL FORGE CONTENT OS</div>
          <h1 style={{ margin: "14px 0 6px", fontSize: 38, letterSpacing: "-.04em" }}>Private Content Import</h1>
          <p style={{ color: "#667085", lineHeight: 1.6, maxWidth: 760 }}>Upload the private normalized JSON manifest generated from the Capital Forge Full Content Export. The browser reads the file locally and sends it to the protected server-side importer. The source PDF and manifest are never committed to the public GitHub repository.</p>
        </div>

        <section style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 22, padding: 24, boxShadow: "0 18px 50px rgba(16,24,40,.06)" }}>
          <div style={{ display: "grid", gap: 18 }}>
            <label style={{ display: "grid", gap: 8, fontWeight: 800 }}>
              1. Normalized manifest or staging payload
              <input type="file" accept="application/json,.json" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ border: "1px solid #d0d5dd", borderRadius: 14, padding: 14, background: "#fff" }} />
              <small style={{ color: "#667085", fontWeight: 500 }}>{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : "Use capital_forge_export_staging_payload.json from the private import bundle."}</small>
            </label>

            <label style={{ display: "grid", gap: 8, fontWeight: 800 }}>
              2. Import batch
              <input value={batchName} onChange={(e) => setBatchName(e.target.value)} style={{ border: "1px solid #d0d5dd", borderRadius: 14, padding: 14 }} />
            </label>

            <label style={{ display: "grid", gap: 8, fontWeight: 800 }}>
              3. Capital Forge admin secret
              <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="CAPITAL_FORGE_ADMIN_SECRET" autoComplete="off" style={{ border: "1px solid #d0d5dd", borderRadius: 14, padding: 14 }} />
              <small style={{ color: "#667085", fontWeight: 500 }}>The secret is sent only in the request header and is not stored by this page.</small>
            </label>

            <button onClick={runImport} disabled={!ready} style={{ border: 0, borderRadius: 14, padding: "14px 18px", fontWeight: 900, background: ready ? "#1769ff" : "#cfd8e8", color: "white", cursor: ready ? "pointer" : "not-allowed" }}>{busy ? "Importing…" : "Stage 605 Objects →"}</button>
          </div>
        </section>

        <section style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 }}>
          {[ ["105", "Decision cases"], ["500", "Core practice items"], ["0", "Auto-published"] ].map(([value, label]) => (
            <div key={label} style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}><b style={{ display: "block", fontSize: 28, color: label === "Auto-published" ? "#d92d20" : "#1769ff" }}>{value}</b><span style={{ color: "#667085" }}>{label}</span></div>
          ))}
        </section>

        {message && <div style={{ marginTop: 20, borderRadius: 16, padding: 16, background: result?.ok ? "#ecfdf3" : "#fff8eb", border: `1px solid ${result?.ok ? "#abefc6" : "#fedf89"}`, color: "#344054" }}>{message}</div>}

        {result && <section style={{ marginTop: 20, background: "#101828", color: "#e6edf7", borderRadius: 20, padding: 20, overflow: "auto" }}><pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.55 }}>{JSON.stringify(result, null, 2)}</pre></section>}

        <section style={{ marginTop: 20, border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 18, padding: 18 }}>
          <b style={{ color: "#b42318" }}>Safety rule</b>
          <p style={{ color: "#667085", lineHeight: 1.6, marginBottom: 0 }}>This importer stages content only. It does not bypass quality review or publish the 204 calculation-oriented items. Those remain subject to deterministic finance verification before canonical publication.</p>
        </section>
      </div>
    </main>
  );
}
