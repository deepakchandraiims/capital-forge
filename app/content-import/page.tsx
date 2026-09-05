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
  uploadedFiles?: string[];
  uploadedFileCount?: number;
  expectedObjectCount?: number;
};

type Preview = {
  total: number;
  calculations: number;
  cases: number;
  interview: number;
};

type BatchStatus = {
  uploadedFiles: string[];
  uploadedFileCount: number;
  stagedObjects: number;
  expectedObjects: number;
  totalChunks: number;
};

const UPLOAD_CHUNK_SIZE = 100;

function splitFileMeta(name: string) {
  const match = name.match(/^(.*)_part_(\d+)_of_(\d+)\.json$/i);
  if (!match) return null;
  return {
    prefix: match[1],
    part: Number(match[2]),
    totalParts: Number(match[3]),
  };
}

export default function ContentImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [secret, setSecret] = useState("");
  const [batchName, setBatchName] = useState("CF-V2-2000-20260905-001");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<Preview>({ total: 0, calculations: 0, cases: 0, interview: 0 });
  const [status, setStatus] = useState<BatchStatus>({ uploadedFiles: [], uploadedFileCount: 0, stagedObjects: 0, expectedObjects: 2000, totalChunks: 20 });

  const ready = useMemo(() => Boolean(file && secret.trim() && !busy), [file, secret, busy]);
  const splitMeta = file ? splitFileMeta(file.name) : null;

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

      const meta = splitFileMeta(nextFile.name);
      if (meta) {
        setMessage(`Ready to upload Part ${String(meta.part).padStart(2, "0")} of ${meta.totalParts} · ${rows.length} objects. Uploaded-file status is tracked by batch.`);
        setStatus((s) => ({ ...s, expectedObjects: rows.length * meta.totalParts, totalChunks: meta.totalParts }));
      } else {
        setMessage(`Ready to stage ${rows.length.toLocaleString()} objects in ${Math.ceil(rows.length / UPLOAD_CHUNK_SIZE)} protected chunks. Nothing will be auto-published.`);
      }
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

  function applyStatus(data: ImportResult) {
    if (!data.uploadedFiles) return;
    setStatus({
      uploadedFiles: data.uploadedFiles,
      uploadedFileCount: Number(data.uploadedFileCount ?? data.uploadedFiles.length),
      stagedObjects: Number(data.stagedObjectsInBatch || 0),
      expectedObjects: Number(data.expectedObjectCount || data.sourceObjects || status.expectedObjects || 0),
      totalChunks: Number(data.totalChunks || status.totalChunks || 0),
    });
  }

  async function refreshStatus() {
    if (!secret.trim() || !batchName.trim()) {
      setMessage("Enter the admin secret and batch name first.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/content-import?batchName=${encodeURIComponent(batchName.trim())}`, {
        headers: { "x-capital-forge-admin": secret.trim() },
      });
      const data = await parseResponse(response);
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not read batch status.");
      applyStatus(data);
      setMessage(`Batch status refreshed: ${Number(data.stagedObjectsInBatch || 0).toLocaleString()} objects staged across ${Number(data.uploadedFileCount || 0)} uploaded file(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function sendChunk(rows: any[], filename: string, expectedTotal: number, chunkIndex: number, totalChunks: number, finalize: boolean) {
    const response = await fetch("/api/admin/content-import", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-capital-forge-admin": secret.trim(),
      },
      body: JSON.stringify({
        batchName: batchName.trim() || "CF-CONTENT-IMPORT-MANUAL",
        filename,
        expectedTotal,
        chunkIndex,
        totalChunks,
        finalize,
        payload: rows,
      }),
    });
    const data = await parseResponse(response);
    if (!response.ok || !data.ok) throw new Error(data.error || `Upload failed for ${filename}.`);
    applyStatus(data);
    return data;
  }

  async function runImport() {
    if (!file || !secret.trim()) return;
    setBusy(true);
    setResult(null);

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const rows = Array.isArray(payload) ? payload : payload?.objects;
      if (!Array.isArray(rows) || rows.length === 0) throw new Error("The selected file is empty or invalid.");

      const manualPart = splitFileMeta(file.name);
      if (manualPart) {
        const expectedTotal = rows.length * manualPart.totalParts;
        setMessage(`Uploading ${file.name} · Part ${manualPart.part} of ${manualPart.totalParts}…`);
        const data = await sendChunk(
          rows,
          file.name,
          expectedTotal,
          manualPart.part - 1,
          manualPart.totalParts,
          manualPart.part === manualPart.totalParts,
        );
        setResult(data);
        setMessage(`Uploaded ${file.name}. Batch now has ${Number(data.stagedObjectsInBatch || 0).toLocaleString()} / ${expectedTotal.toLocaleString()} objects staged.`);
        return;
      }

      const totalChunks = Math.ceil(rows.length / UPLOAD_CHUNK_SIZE);
      let insertedTotal = 0;
      let skippedTotal = 0;
      let finalResult: ImportResult | null = null;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        const start = chunkIndex * UPLOAD_CHUNK_SIZE;
        const chunkRows = rows.slice(start, start + UPLOAD_CHUNK_SIZE);
        const chunkFilename = `${file.name.replace(/\.json$/i, "")}_auto_chunk_${String(chunkIndex + 1).padStart(2, "0")}_of_${String(totalChunks).padStart(2, "0")}.json`;
        setMessage(`Staging chunk ${chunkIndex + 1} of ${totalChunks} · ${Math.min(start + chunkRows.length, rows.length).toLocaleString()} / ${rows.length.toLocaleString()} objects…`);
        const data = await sendChunk(chunkRows, chunkFilename, rows.length, chunkIndex, totalChunks, chunkIndex === totalChunks - 1);
        insertedTotal += Number(data.inserted || 0);
        skippedTotal += Number(data.existingKeysSkipped || 0);
        finalResult = data;
      }

      if (!finalResult) throw new Error("No import result was returned.");
      const completed = { ...finalResult, inserted: insertedTotal, existingKeysSkipped: skippedTotal, sourceObjects: rows.length };
      setResult(completed);
      setMessage(`Import finished: ${Number(completed.stagedObjectsInBatch || 0).toLocaleString()} objects staged. Nothing was auto-published.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const uploaded = new Set(status.uploadedFiles);
  const expectedPartNames = splitMeta
    ? Array.from({ length: splitMeta.totalParts }, (_, i) => `${splitMeta.prefix}_part_${String(i + 1).padStart(2, "0")}_of_${String(splitMeta.totalParts).padStart(2, "0")}.json`)
    : [];

  return (
    <main style={{ minHeight: "100vh", background: "#f6f8fc", padding: "36px", color: "#101828", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "inline-flex", borderRadius: 999, background: "#eaf2ff", color: "#1457d9", padding: "7px 11px", fontWeight: 800, fontSize: 12 }}>CAPITAL FORGE CONTENT OS</div>
          <h1 style={{ margin: "14px 0 6px", fontSize: 38, letterSpacing: "-.04em" }}>Private Content Import</h1>
          <p style={{ color: "#667085", lineHeight: 1.6, maxWidth: 820 }}>Upload either the complete staging payload or one of the 20 split JSON files. The batch tracker records which filenames have already been staged so you can stop and resume safely.</p>
        </div>

        <section style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 22, padding: 24, boxShadow: "0 18px 50px rgba(16,24,40,.06)" }}>
          <div style={{ display: "grid", gap: 18 }}>
            <label style={{ display: "grid", gap: 8, fontWeight: 800 }}>
              1. Normalized staging payload / split part
              <input type="file" accept="application/json,.json" onChange={(e) => inspectFile(e.target.files?.[0] || null)} style={{ border: "1px solid #d0d5dd", borderRadius: 14, padding: 14, background: "#fff" }} />
              <small style={{ color: "#667085", fontWeight: 500 }}>{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : "Select the full payload or capital_forge_2000_part_XX_of_20.json."}</small>
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <button onClick={runImport} disabled={!ready} style={{ border: 0, borderRadius: 14, padding: "14px 18px", fontWeight: 900, background: ready ? "#1769ff" : "#cfd8e8", color: "white", cursor: ready ? "pointer" : "not-allowed" }}>
                {busy ? "Working…" : splitMeta ? `Upload Part ${String(splitMeta.part).padStart(2, "0")} of ${splitMeta.totalParts} →` : `Stage ${preview.total ? preview.total.toLocaleString() : "Content"} Objects →`}
              </button>
              <button onClick={refreshStatus} disabled={!secret.trim() || busy} style={{ border: "1px solid #d0d5dd", borderRadius: 14, padding: "14px 18px", fontWeight: 800, background: "white", color: "#344054", cursor: !secret.trim() || busy ? "not-allowed" : "pointer" }}>Refresh Upload Status</button>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }}>
          {[
            [preview.total.toLocaleString(), "Selected-file objects"],
            [preview.cases.toLocaleString(), "Decision cases"],
            [preview.interview.toLocaleString(), "Interview"],
            [preview.calculations.toLocaleString(), "Calculations"],
          ].map(([value, label]) => (
            <div key={label} style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}><b style={{ display: "block", fontSize: 28, color: "#1769ff" }}>{value}</b><span style={{ color: "#667085" }}>{label}</span></div>
          ))}
        </section>

        <section style={{ marginTop: 20, background: "white", border: "1px solid #e4e7ec", borderRadius: 20, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
            <div>
              <b style={{ fontSize: 20 }}>Batch upload tracker</b>
              <div style={{ color: "#667085", marginTop: 4 }}>{status.stagedObjects.toLocaleString()} / {status.expectedObjects.toLocaleString()} objects staged · {status.uploadedFileCount} file(s) recorded</div>
            </div>
          </div>

          {expectedPartNames.length > 0 ? (
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              {expectedPartNames.map((name, idx) => {
                const done = uploaded.has(name);
                return <div key={name} style={{ border: `1px solid ${done ? "#abefc6" : "#e4e7ec"}`, background: done ? "#ecfdf3" : "#f9fafb", borderRadius: 12, padding: "10px 12px", fontSize: 13 }}>
                  <b style={{ color: done ? "#067647" : "#475467" }}>{done ? "✓ Uploaded" : "○ Pending"} · Part {String(idx + 1).padStart(2, "0")}</b>
                  <div style={{ color: "#667085", marginTop: 3, overflowWrap: "anywhere" }}>{name}</div>
                </div>;
              })}
            </div>
          ) : status.uploadedFiles.length > 0 ? (
            <div style={{ marginTop: 14, display: "grid", gap: 7 }}>
              {status.uploadedFiles.map((name) => <div key={name} style={{ border: "1px solid #abefc6", background: "#ecfdf3", borderRadius: 10, padding: "9px 11px", color: "#067647", overflowWrap: "anywhere" }}>✓ {name}</div>)}
            </div>
          ) : (
            <p style={{ color: "#667085", marginBottom: 0 }}>No uploaded files are shown yet. Enter the admin secret and click <b>Refresh Upload Status</b>, or upload Part 01.</p>
          )}
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
