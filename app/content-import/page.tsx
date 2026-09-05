"use client";

import { useMemo, useState } from "react";

type ImportResult = {
  ok?: boolean;
  error?: string;
  batchName?: string;
  batchId?: string;
  sourceObjects?: number;
  chunkObjects?: number;
  chunkIndex?: number;
  totalChunks?: number;
  existingKeysSkipped?: number;
  inserted?: number;
  stagedObjectsInBatch?: number;
  validationCalled?: boolean;
  validationMessage?: string;
  statusSummary?: Record<string, number>;
  published?: number;
  note?: string;
};

type Preview = {
  total: number;
  calculations: number;
  cases: number;
  interview: number;
};

const UPLOAD_CHUNK_SIZE = 100;

export default function ContentImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [secret, setSecret] = useState("");
  const [batchName, setBatchName] = useState("CF-V2-2000-20260905-001");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<Preview>({ total: 0, calculations: 0, cases: 0, interview: 0 });

  const ready = useMemo(() => Boolean(file && secret.trim() && !busy), [file, secret, busy]);

  async function inspectFile(nextFile: File | null) {
    setFile(nextFile);
    setResult(null);
    setMessage("");
    setPreview({ total: 0, calculations: 0, cases: 0, interview: 0 });
    if (!nextFile) return;

    try {
      const text = await nextFile.text();
      const payload = JSON.parse(text);
      const rows = Array.isArray(payload) ? payload : payload?.objects;
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("The selected file does not contain a staging array or an objects array.");
      }
      if (rows.length > 5000) {
        throw new Error(`This protected importer accepts up to 5,000 objects per batch. Found ${rows.length}.`);
      }

      const keys = rows.map((row: any) => String(row?.source_record_key || "")).filter(Boolean);
      if (keys.length !== rows.length || new Set(keys).size !== rows.length) {
        throw new Error("Every object must have one non-empty unique source_record_key.");
      }

      const calculations = rows.filter((row: any) => Boolean(row?.raw_content?.calculation_required ?? row?.calculation_required)).length;
      const cases = rows.filter((row: any) => (row?.raw_content?.origin_content_type || row?.content_type) === "decision_case" || row?.content_type === "case").length;
      const interview = rows.filter((row: any) => (row?.raw_content?.origin_content_type || row?.content_type) === "interview_question" || row?.content_type === "interview_question").length;
      setPreview({ total: rows.length, calculations, cases, interview });
      setMessage(`Ready to stage ${rows.length.toLocaleString()} objects in ${Math.ceil(rows.length / UPLOAD_CHUNK_SIZE)} protected chunks. Nothing will be auto-published.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function parseResponse(response: Response): Promise<ImportResult> {
    const raw = await response.text();
    try {
      return JSON.parse(raw) as ImportResult;
    } catch {
      const snippet = raw.replace(/\s+/g, " ").slice(0, 240) || response.statusText || "empty response";
      throw new Error(`Import endpoint returned HTTP ${response.status}: ${snippet}`);
    }
  }

  async function runImport() {
    if (!file || !secret.trim()) return;
    setBusy(true);
    setMessage("Reading the private staging payload locally…");
    setResult(null);

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const rows = Array.isArray(payload) ? payload : payload?.objects;
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("The selected file does not contain a staging array or an objects array.");
      }
      if (rows.length > 5000) {
        throw new Error(`This protected importer accepts up to 5,000 objects per batch. Found ${rows.length}.`);
      }

      const keys = rows.map((row: any) => String(row?.source_record_key || "")).filter(Boolean);
      if (keys.length !== rows.length || new Set(keys).size !== rows.length) {
        throw new Error("Every object must have one non-empty unique source_record_key.");
      }

      const totalChunks = Math.ceil(rows.length / UPLOAD_CHUNK_SIZE);
      let insertedTotal = 0;
      let skippedTotal = 0;
      let finalResult: ImportResult | null = null;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        const start = chunkIndex * UPLOAD_CHUNK_SIZE;
        const chunkRows = rows.slice(start, start + UPLOAD_CHUNK_SIZE);
        const isFinal = chunkIndex === totalChunks - 1;
        setMessage(`Staging chunk ${chunkIndex + 1} of ${totalChunks} · ${Math.min(start + chunkRows.length, rows.length).toLocaleString()} / ${rows.length.toLocaleString()} objects…`);

        const response = await fetch("/api/admin/content-import", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-capital-forge-admin": secret.trim(),
          },
          body: JSON.stringify({
            batchName: batchName.trim() || "CF-CONTENT-IMPORT-MANUAL",
            filename: file.name,
            expectedTotal: rows.length,
            chunkIndex,
            totalChunks,
            finalize: isFinal,
            payload: chunkRows,
          }),
        });

        const data = await parseResponse(response);
        if (!response.ok || !data.ok) {
          throw new Error(data.error || `Chunk ${chunkIndex + 1} failed.`);
        }
        insertedTotal += Number(data.inserted || 0);
        skippedTotal += Number(data.existingKeysSkipped || 0);
        finalResult = data;
      }

      if (!finalResult) throw new Error("No import result was returned.");
      const completed: ImportResult = {
        ...finalResult,
        inserted: insertedTotal,
        existingKeysSkipped: skippedTotal,
        sourceObjects: rows.length,
      };
      setResult(completed);
      setMessage(`Import finished: ${Number(completed.stagedObjectsInBatch || 0).toLocaleString()} objects are staged. Review the summary below; nothing was auto-published.`);
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
          <p style={{ color: "#667085", lineHeight: 1.6, maxWidth: 760 }}>Upload a private normalized JSON staging payload. Large payloads are split locally into protected chunks before reaching the server. Source datasets and manifests are never committed to the public GitHub repository.</p>
        </div>

        <section style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 22, padding: 24, boxShadow: "0 18px 50px rgba(16,24,40,.06)" }}>
          <div style={{ display: "grid", gap: 18 }}>
            <label style={{ display: "grid", gap: 8, fontWeight: 800 }}>
              1. Normalized staging payload
              <input type="file" accept="application/json,.json" onChange={(e) => inspectFile(e.target.files?.[0] || null)} style={{ border: "1px solid #d0d5dd", borderRadius: 14, padding: 14, background: "#fff" }} />
              <small style={{ color: "#667085", fontWeight: 500 }}>{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : "Use a Capital Forge staging-payload JSON file."}</small>
            </label>

            <label style={{ display: "grid", gap: 8, fontWeight: 800 }}>
              2. Import batch
              <input value={batchName} onChange={(e) => setBatchName(e.target.value)} style={{ border: "1px solid #d0d5dd", borderRadius: 14, padding: 14 }} />
            </label>

            <label style={{ display: "grid", gap: 8, fontWeight: 800 }}>
              3. Capital Forge admin secret
              <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="CAPITAL_FORGE_ADMIN_SECRET" autoComplete="off" style={{ border: "1px solid #d0d5dd", borderRadius: 14, padding: 14 }} />
              <small style={{ color: "#667085", fontWeight: 500 }}>The secret is sent only in request headers and is not stored by this page.</small>
            </label>

            <button onClick={runImport} disabled={!ready} style={{ border: 0, borderRadius: 14, padding: "14px 18px", fontWeight: 900, background: ready ? "#1769ff" : "#cfd8e8", color: "white", cursor: ready ? "pointer" : "not-allowed" }}>{busy ? "Importing in chunks…" : `Stage ${preview.total ? preview.total.toLocaleString() : "Content"} Objects →`}</button>
          </div>
        </section>

        <section style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }}>
          {[
            [preview.total.toLocaleString(), "Objects"],
            [preview.cases.toLocaleString(), "Decision cases"],
            [preview.interview.toLocaleString(), "Interview"],
            [preview.calculations.toLocaleString(), "Calculations"],
          ].map(([value, label]) => (
            <div key={label} style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}><b style={{ display: "block", fontSize: 28, color: "#1769ff" }}>{value}</b><span style={{ color: "#667085" }}>{label}</span></div>
          ))}
        </section>

        {message && <div style={{ marginTop: 20, borderRadius: 16, padding: 16, background: result?.ok ? "#ecfdf3" : "#fff8eb", border: `1px solid ${result?.ok ? "#abefc6" : "#fedf89"}`, color: "#344054" }}>{message}</div>}

        {result && <section style={{ marginTop: 20, background: "#101828", color: "#e6edf7", borderRadius: 20, padding: 20, overflow: "auto" }}><pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.55 }}>{JSON.stringify(result, null, 2)}</pre></section>}

        <section style={{ marginTop: 20, border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 18, padding: 18 }}>
          <b style={{ color: "#b42318" }}>Safety rule</b>
          <p style={{ color: "#667085", lineHeight: 1.6, marginBottom: 0 }}>This importer stages content only. It does not bypass structural validation, deterministic calculation verification, qualitative review or the canonical publication gate.</p>
        </section>
      </div>
    </main>
  );
}
