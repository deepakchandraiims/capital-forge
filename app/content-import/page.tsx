"use client";

import { useEffect, useMemo, useState } from "react";

type ImportResult = {
  ok?: boolean;
  error?: string;
  complete?: boolean;
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
  uploadedFiles?: UploadedFile[];
  uploadedFileCount?: number;
  expectedObjectCount?: number;
};

type UploadedFile = {
  filename: string;
  chunkIndex?: number;
  totalChunks?: number;
  objects?: number;
  firstKey?: string;
  lastKey?: string;
  uploadedAt?: string;
};

type BatchStatus = {
  ok?: boolean;
  exists?: boolean;
  batchName?: string;
  batchId?: string;
  status?: string;
  stagedObjectsInBatch?: number;
  expectedTotal?: number;
  uploadedFiles?: UploadedFile[];
  validationCalled?: boolean;
  validationMessage?: string;
};

type Preview = {
  total: number;
  calculations: number;
  cases: number;
  interview: number;
};

const TARGET_BATCH = "CF-V2-2000-20260905-001";
const EXPECTED_TOTAL = 2000;
const EXPECTED_PARTS = 20;
const UPLOAD_CHUNK_SIZE = 100;

function parsePartNumber(name: string) {
  const match = name.match(/part[_-]?(\d+)[_-]of[_-]?(\d+)/i);
  if (!match) return null;
  return { part: Number(match[1]), total: Number(match[2]) };
}

function sortedFiles(files: File[]) {
  return [...files].sort((a, b) => {
    const pa = parsePartNumber(a.name)?.part ?? 9999;
    const pb = parsePartNumber(b.name)?.part ?? 9999;
    return pa - pb || a.name.localeCompare(b.name);
  });
}

export default function ContentImportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<Preview>({ total: 0, calculations: 0, cases: 0, interview: 0 });
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);

  const ready = useMemo(() => Boolean(files.length && !busy), [files, busy]);

  async function refreshBatchStatus() {
    try {
      const response = await fetch(`/api/admin/content-import?batchName=${encodeURIComponent(TARGET_BATCH)}`, { cache: "no-store" });
      const raw = await response.text();
      const data = JSON.parse(raw) as BatchStatus;
      if (response.ok && data.ok) setBatchStatus(data);
    } catch {
      // Status is supplementary; upload failures are surfaced separately.
    }
  }

  useEffect(() => {
    void refreshBatchStatus();
  }, []);

  async function inspectFiles(nextFiles: File[]) {
    const ordered = sortedFiles(nextFiles);
    setFiles(ordered);
    setResult(null);
    setMessage("");
    setPreview({ total: 0, calculations: 0, cases: 0, interview: 0 });
    if (!ordered.length) return;

    try {
      let total = 0;
      let calculations = 0;
      let cases = 0;
      let interview = 0;
      const allKeys: string[] = [];

      for (const file of ordered) {
        const text = await file.text();
        const payload = JSON.parse(text);
        const rows = Array.isArray(payload) ? payload : payload?.objects;
        if (!Array.isArray(rows) || rows.length === 0) throw new Error(`${file.name} is empty or invalid.`);
        if (rows.length > 5000) throw new Error(`${file.name} contains more than 5,000 objects.`);

        const keys = rows.map((row: any) => String(row?.source_record_key || "")).filter(Boolean);
        if (keys.length !== rows.length || new Set(keys).size !== rows.length) {
          throw new Error(`${file.name} contains a missing or duplicate source_record_key.`);
        }
        allKeys.push(...keys);
        total += rows.length;
        calculations += rows.filter((row: any) => Boolean(row?.raw_content?.calculation_required ?? row?.calculation_required)).length;
        cases += rows.filter((row: any) => (row?.raw_content?.origin_content_type || row?.content_type) === "decision_case" || row?.content_type === "case").length;
        interview += rows.filter((row: any) => (row?.raw_content?.origin_content_type || row?.content_type) === "interview_question" || row?.content_type === "interview_question").length;
      }

      if (new Set(allKeys).size !== allKeys.length) throw new Error("The selected files contain duplicate source_record_key values across files.");

      setPreview({ total, calculations, cases, interview });
      setMessage(`Ready to upload ${ordered.length} file${ordered.length === 1 ? "" : "s"} containing ${total.toLocaleString()} objects. No admin secret is required. Nothing will be auto-published.`);
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

  async function postChunk(args: {
    filename: string;
    rows: any[];
    expectedTotal: number;
    chunkIndex: number;
    totalChunks: number;
    finalize: boolean;
  }) {
    const response = await fetch("/api/admin/content-import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        batchName: TARGET_BATCH,
        filename: args.filename,
        expectedTotal: args.expectedTotal,
        chunkIndex: args.chunkIndex,
        totalChunks: args.totalChunks,
        finalize: args.finalize,
        payload: args.rows,
      }),
    });
    const data = await parseResponse(response);
    if (!response.ok || !data.ok) throw new Error(data.error || `Upload failed for ${args.filename}.`);
    return data;
  }

  async function runImport() {
    if (!files.length) return;
    setBusy(true);
    setResult(null);

    try {
      const ordered = sortedFiles(files);
      let finalResult: ImportResult | null = null;
      let insertedTotal = 0;
      let skippedTotal = 0;

      for (const file of ordered) {
        const text = await file.text();
        const payload = JSON.parse(text);
        const rows = Array.isArray(payload) ? payload : payload?.objects;
        if (!Array.isArray(rows) || !rows.length) throw new Error(`${file.name} is empty or invalid.`);

        const partMeta = parsePartNumber(file.name);
        if (partMeta && partMeta.total === EXPECTED_PARTS && rows.length <= 250) {
          setMessage(`Uploading ${file.name} · part ${partMeta.part} of ${partMeta.total}…`);
          const data = await postChunk({
            filename: file.name,
            rows,
            expectedTotal: EXPECTED_TOTAL,
            chunkIndex: partMeta.part - 1,
            totalChunks: partMeta.total,
            finalize: partMeta.part === partMeta.total,
          });
          insertedTotal += Number(data.inserted || 0);
          skippedTotal += Number(data.existingKeysSkipped || 0);
          finalResult = data;
          await refreshBatchStatus();
          continue;
        }

        if (rows.length !== EXPECTED_TOTAL) {
          throw new Error(`${file.name} is neither a recognised split part nor the complete ${EXPECTED_TOTAL.toLocaleString()}-object payload.`);
        }

        const totalChunks = Math.ceil(rows.length / UPLOAD_CHUNK_SIZE);
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
          const start = chunkIndex * UPLOAD_CHUNK_SIZE;
          const chunkRows = rows.slice(start, start + UPLOAD_CHUNK_SIZE);
          setMessage(`Uploading ${file.name} · chunk ${chunkIndex + 1} of ${totalChunks} · ${Math.min(start + chunkRows.length, rows.length).toLocaleString()} / ${rows.length.toLocaleString()} objects…`);
          const data = await postChunk({
            filename: `${file.name}#chunk-${String(chunkIndex + 1).padStart(2, "0")}`,
            rows: chunkRows,
            expectedTotal: EXPECTED_TOTAL,
            chunkIndex,
            totalChunks,
            finalize: chunkIndex === totalChunks - 1,
          });
          insertedTotal += Number(data.inserted || 0);
          skippedTotal += Number(data.existingKeysSkipped || 0);
          finalResult = data;
          await refreshBatchStatus();
        }
      }

      if (!finalResult) throw new Error("No import result was returned.");
      const completed: ImportResult = { ...finalResult, inserted: insertedTotal, existingKeysSkipped: skippedTotal };
      setResult(completed);
      await refreshBatchStatus();
      setMessage(`Upload finished. ${Number(completed.stagedObjectsInBatch || 0).toLocaleString()} / ${EXPECTED_TOTAL.toLocaleString()} objects are staged. Nothing was auto-published.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      await refreshBatchStatus();
    } finally {
      setBusy(false);
    }
  }

  const uploadedFiles = batchStatus?.uploadedFiles || [];
  const uploadedPartNumbers = new Set(uploadedFiles.map((f) => parsePartNumber(f.filename)?.part).filter((n): n is number => Boolean(n)));

  return (
    <main style={{ minHeight: "100vh", background: "#f6f8fc", padding: "36px", color: "#101828", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "inline-flex", borderRadius: 999, background: "#eaf2ff", color: "#1457d9", padding: "7px 11px", fontWeight: 800, fontSize: 12 }}>CAPITAL FORGE CONTENT OS</div>
          <h1 style={{ margin: "14px 0 6px", fontSize: 38, letterSpacing: "-.04em" }}>Direct V2 Content Upload</h1>
          <p style={{ color: "#667085", lineHeight: 1.6, maxWidth: 820 }}>Upload the Capital Forge V2 payload directly. No admin secret is required. Select one split part, several parts, all 20 parts at once, or the complete 2,000-object payload. The endpoint is restricted to this one V2 batch and stages content only.</p>
        </div>

        <section style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 22, padding: 24, boxShadow: "0 18px 50px rgba(16,24,40,.06)" }}>
          <div style={{ display: "grid", gap: 18 }}>
            <label style={{ display: "grid", gap: 8, fontWeight: 800 }}>
              Select V2 JSON file(s)
              <input type="file" multiple accept="application/json,.json" onChange={(e) => inspectFiles(Array.from(e.target.files || []))} style={{ border: "1px solid #d0d5dd", borderRadius: 14, padding: 14, background: "#fff" }} />
              <small style={{ color: "#667085", fontWeight: 500 }}>{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected · ${preview.total.toLocaleString()} objects` : "Select Part 01–20 together for the fastest upload."}</small>
            </label>

            <div style={{ borderRadius: 14, border: "1px solid #d0d5dd", padding: 14, background: "#f9fafb" }}>
              <b>Import batch</b><div style={{ marginTop: 6, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#475467" }}>{TARGET_BATCH}</div>
            </div>

            <button onClick={runImport} disabled={!ready} style={{ border: 0, borderRadius: 14, padding: "14px 18px", fontWeight: 900, background: ready ? "#1769ff" : "#cfd8e8", color: "white", cursor: ready ? "pointer" : "not-allowed" }}>{busy ? "Uploading…" : `Upload ${files.length ? files.length : "V2"} File${files.length === 1 ? "" : "s"} →`}</button>
          </div>
        </section>

        <section style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }}>
          {[[preview.total.toLocaleString(), "Selected objects"],[preview.cases.toLocaleString(), "Decision cases"],[preview.interview.toLocaleString(), "Interview"],[preview.calculations.toLocaleString(), "Calculations"]].map(([value, label]) => (
            <div key={label} style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}><b style={{ display: "block", fontSize: 28, color: "#1769ff" }}>{value}</b><span style={{ color: "#667085" }}>{label}</span></div>
          ))}
        </section>

        <section style={{ marginTop: 20, background: "white", border: "1px solid #e4e7ec", borderRadius: 20, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
            <div><b style={{ fontSize: 20 }}>Uploaded files</b><div style={{ color: "#667085", marginTop: 4 }}>{uploadedPartNumbers.size} / {EXPECTED_PARTS} split parts detected · {(batchStatus?.stagedObjectsInBatch || 0).toLocaleString()} / {EXPECTED_TOTAL.toLocaleString()} objects staged</div></div>
            <button onClick={() => refreshBatchStatus()} disabled={busy} style={{ border: "1px solid #d0d5dd", borderRadius: 10, padding: "8px 12px", background: "white", fontWeight: 800, cursor: "pointer" }}>Refresh status</button>
          </div>
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 9 }}>
            {Array.from({ length: EXPECTED_PARTS }, (_, idx) => idx + 1).map((part) => {
              const uploaded = uploadedPartNumbers.has(part);
              return <div key={part} style={{ borderRadius: 11, border: `1px solid ${uploaded ? "#abefc6" : "#eaecf0"}`, background: uploaded ? "#ecfdf3" : "#f9fafb", padding: "10px 11px", color: uploaded ? "#067647" : "#667085", fontWeight: 800 }}>Part {String(part).padStart(2, "0")} {uploaded ? "✓" : "—"}</div>;
            })}
          </div>
          {uploadedFiles.length > 0 && <div style={{ marginTop: 16, color: "#667085", fontSize: 13, lineHeight: 1.7 }}>Server-recorded files: {uploadedFiles.map((f) => f.filename).join(" · ")}</div>}
        </section>

        {message && <div style={{ marginTop: 20, borderRadius: 16, padding: 16, background: result?.ok ? "#ecfdf3" : "#fff8eb", border: `1px solid ${result?.ok ? "#abefc6" : "#fedf89"}`, color: "#344054" }}>{message}</div>}
        {result && <section style={{ marginTop: 20, background: "#101828", color: "#e6edf7", borderRadius: 20, padding: 20, overflow: "auto" }}><pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.55 }}>{JSON.stringify(result, null, 2)}</pre></section>}

        <section style={{ marginTop: 20, border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 18, padding: 18 }}>
          <b style={{ color: "#b42318" }}>Staging safety rule</b>
          <p style={{ color: "#667085", lineHeight: 1.6, marginBottom: 0 }}>Direct upload is limited to batch {TARGET_BATCH}, CF2 record keys and the Capital Forge V2 source model. It cannot publish canonical content. Once all 2,000 objects are staged, the batch is treated as complete and new content is refused.</p>
        </section>
      </div>
    </main>
  );
}
