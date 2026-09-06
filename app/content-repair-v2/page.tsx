"use client";

import { useEffect, useMemo, useState } from "react";

type Counts = {
  total: number;
  validated: number;
  needsReview: number;
  duplicate: number;
  published: number;
  pending: number;
};

type IssueSample = {
  source_record_key: string;
  content_type?: string;
  validation_status?: string;
  review_notes?: unknown;
  raw_content_type?: string;
  origin_content_type?: string;
  question_type?: string;
};

type StatusResponse = {
  ok?: boolean;
  error?: string;
  batchName?: string;
  batchId?: string;
  status?: string;
  counts?: Counts;
  issueSamples?: IssueSample[];
};

const EMPTY: Counts = { total: 0, validated: 0, needsReview: 0, duplicate: 0, published: 0, pending: 0 };
const TOTAL_CHUNKS = 20;

async function readJson(response: Response) {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    const snippet = raw.replace(/\s+/g, " ").slice(0, 260) || response.statusText || "empty response";
    throw new Error(`Repair endpoint returned HTTP ${response.status}: ${snippet}`);
  }
}

export default function ContentRepairV2Page() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading V2 batch status…");
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const counts = status?.counts || EMPTY;
  const ready = useMemo(() => !busy && counts.total === 2000, [busy, counts.total]);

  async function refreshStatus() {
    const response = await fetch("/api/admin/content-repair-v2", { cache: "no-store" });
    const data = await readJson(response) as StatusResponse;
    if (!response.ok || !data.ok) throw new Error(data.error || "Could not read V2 validation status.");
    setStatus(data);
    return data;
  }

  useEffect(() => {
    refreshStatus()
      .then((data) => setMessage(data.counts?.validated === 2000 ? "All 2,000 objects are structurally validated." : "Ready to repair the staged V2 batch. Publication remains blocked."))
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
  }, []);

  function append(line: string) {
    setLog((old) => [...old.slice(-79), line]);
  }

  async function post(action: string, extra: Record<string, unknown> = {}) {
    const response = await fetch("/api/admin/content-repair-v2", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await readJson(response);
    if (!response.ok || !data.ok) throw new Error(data.error || `${action} failed.`);
    return data;
  }

  async function runAll() {
    if (!ready) return;
    setBusy(true);
    setProgress(0);
    setLog([]);
    setMessage("Repairing V2 objects to the canonical staging contract…");

    try {
      for (let i = 0; i < TOTAL_CHUNKS; i += 1) {
        setMessage(`Repairing structural contract · chunk ${i + 1} of ${TOTAL_CHUNKS}…`);
        const data = await post("repair_chunk", { chunkIndex: i });
        append(`Repair ${String(i + 1).padStart(2, "0")}/20 · ${data.repaired || 0} objects normalized`);
        setProgress(Math.round(((i + 1) / 30) * 100));
      }

      let previousValidated = -1;
      let stalledPasses = 0;
      let finalCounts: Counts = (await refreshStatus()).counts || EMPTY;

      for (let pass = 1; pass <= 10 && finalCounts.validated < 2000; pass += 1) {
        setMessage(`Running full structural validator · pass ${pass}…`);
        const data = await post("validate_pass");
        finalCounts = data.after || finalCounts;
        append(`Batch validation pass ${pass} · ${finalCounts.validated}/2000 validated · ${finalCounts.needsReview} needs review · ${finalCounts.duplicate} duplicates`);
        setProgress(Math.min(88, 67 + pass * 2));

        if (finalCounts.validated === previousValidated) stalledPasses += 1;
        else stalledPasses = 0;
        previousValidated = finalCounts.validated;
        if (stalledPasses >= 2) break;
      }

      if (finalCounts.validated < 2000) {
        append("Batch validator stalled before 2,000. Switching to record-level validation fallback.");
        for (let i = 0; i < TOTAL_CHUNKS; i += 1) {
          setMessage(`Validating remaining records · chunk ${i + 1} of ${TOTAL_CHUNKS}…`);
          const data = await post("validate_individual_chunk", { chunkIndex: i });
          finalCounts = data.counts || finalCounts;
          append(`Record validation ${String(i + 1).padStart(2, "0")}/20 · ${finalCounts.validated}/2000 validated`);
          setProgress(88 + Math.round(((i + 1) / TOTAL_CHUNKS) * 11));
          if (finalCounts.validated === 2000) break;
        }
      }

      const finalStatus = await refreshStatus();
      finalCounts = finalStatus.counts || finalCounts;
      setProgress(100);

      if (finalCounts.validated === 2000 && finalCounts.needsReview === 0 && finalCounts.duplicate === 0) {
        setMessage("Structural repair complete: 2,000 / 2,000 validated. Publication is still intentionally blocked until deterministic and quality gates run.");
        append("SUCCESS · structural validation 2,000/2,000 · 0 blocked structural records");
      } else {
        setMessage(`Repair pass finished at ${finalCounts.validated}/2000 validated. The remaining ${finalCounts.needsReview + finalCounts.duplicate + finalCounts.pending} records are shown below for targeted repair; publication remains blocked.`);
        append(`STOPPED SAFELY · ${finalCounts.validated}/2000 validated · no publication performed`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      append(`ERROR · ${error instanceof Error ? error.message : String(error)}`);
      await refreshStatus().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  const blocked = counts.needsReview + counts.duplicate + counts.pending;
  const pct = counts.total ? Math.round((counts.validated / counts.total) * 1000) / 10 : 0;

  return (
    <main style={{ minHeight: "100vh", background: "#f6f8fc", padding: "34px", color: "#101828", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "inline-flex", borderRadius: 999, background: "#eaf2ff", color: "#1457d9", padding: "7px 11px", fontWeight: 900, fontSize: 12 }}>CAPITAL FORGE · V2 REPAIR</div>
          <h1 style={{ margin: "14px 0 6px", fontSize: 38, letterSpacing: "-.04em" }}>Structural Repair & Revalidation</h1>
          <p style={{ color: "#667085", lineHeight: 1.6, maxWidth: 850 }}>Repairs the already-staged 2,000-object V2 batch to the canonical Capital Forge staging contract, regenerates hashes where required, removes the four known exact-content collisions, and reruns structural validation. This page cannot publish content.</p>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12 }}>
          {[
            [counts.total, "Staged"],
            [counts.validated, "Validated"],
            [counts.needsReview, "Needs review"],
            [counts.duplicate, "Duplicates"],
            [blocked, "Blocked / pending"],
          ].map(([value, label]) => (
            <div key={label} style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}>
              <b style={{ display: "block", fontSize: 28, color: label === "Validated" ? "#067647" : label === "Blocked / pending" && Number(value) ? "#b42318" : "#1769ff" }}>{Number(value).toLocaleString()}</b>
              <span style={{ color: "#667085" }}>{label}</span>
            </div>
          ))}
        </section>

        <section style={{ marginTop: 18, background: "white", border: "1px solid #e4e7ec", borderRadius: 22, padding: 22, boxShadow: "0 18px 50px rgba(16,24,40,.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <b style={{ fontSize: 20 }}>Batch CF-V2-2000-20260905-001</b>
              <div style={{ marginTop: 5, color: "#667085" }}>{counts.validated.toLocaleString()} / 2,000 structurally validated · {pct}%</div>
            </div>
            <button onClick={() => refreshStatus().then(() => setMessage("Status refreshed.")).catch((e) => setMessage(String(e)))} disabled={busy} style={{ border: "1px solid #d0d5dd", borderRadius: 11, padding: "9px 13px", background: "white", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>Refresh status</button>
          </div>

          <div style={{ height: 10, marginTop: 18, borderRadius: 999, background: "#eaecf0", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${busy ? progress : pct}%`, background: counts.validated === 2000 ? "#12b76a" : "#1769ff", transition: "width .2s ease" }} />
          </div>

          <button onClick={runAll} disabled={!ready} style={{ width: "100%", marginTop: 18, border: 0, borderRadius: 14, padding: "15px 18px", fontWeight: 900, fontSize: 15, background: ready ? "#1769ff" : "#cfd8e8", color: "white", cursor: ready ? "pointer" : "not-allowed" }}>
            {busy ? "Repairing & Revalidating…" : counts.validated === 2000 ? "Re-run Safe Structural Check" : "Repair & Revalidate All 2,000 →"}
          </button>
          <div style={{ marginTop: 12, color: "#667085", fontSize: 13 }}>No file upload is required. No validation status is manually forced. The database validators remain the authority.</div>
        </section>

        {message && <div style={{ marginTop: 18, padding: 15, borderRadius: 15, background: counts.validated === 2000 ? "#ecfdf3" : "#fff8eb", border: `1px solid ${counts.validated === 2000 ? "#abefc6" : "#fedf89"}`, color: "#344054", lineHeight: 1.5 }}>{message}</div>}

        {log.length > 0 && <section style={{ marginTop: 18, background: "#101828", color: "#e6edf7", borderRadius: 18, padding: 18, maxHeight: 330, overflow: "auto" }}><pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.65 }}>{log.join("\n")}</pre></section>}

        {(status?.issueSamples?.length || 0) > 0 && <section style={{ marginTop: 18, background: "white", border: "1px solid #e4e7ec", borderRadius: 20, padding: 20 }}>
          <b style={{ fontSize: 19 }}>Remaining structural issue samples</b>
          <div style={{ marginTop: 13, display: "grid", gap: 9 }}>
            {(status?.issueSamples || []).map((x) => <div key={x.source_record_key} style={{ padding: 12, border: "1px solid #eaecf0", borderRadius: 12, background: "#f9fafb" }}>
              <div style={{ fontWeight: 900 }}>{x.source_record_key} · {x.validation_status || "unknown"}</div>
              <div style={{ marginTop: 4, color: "#667085", fontSize: 13 }}>outer={x.content_type || "—"} · raw={x.raw_content_type || "—"} · origin={x.origin_content_type || "—"} · question_type={x.question_type || "—"}</div>
              {x.review_notes != null && <div style={{ marginTop: 5, color: "#b42318", fontSize: 13, whiteSpace: "pre-wrap" }}>{typeof x.review_notes === "string" ? x.review_notes : JSON.stringify(x.review_notes)}</div>}
            </div>)}
          </div>
        </section>}

        <section style={{ marginTop: 18, border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 18, padding: 17 }}>
          <b style={{ color: "#b42318" }}>Publication safety</b>
          <p style={{ color: "#667085", lineHeight: 1.6, marginBottom: 0 }}>This tool only normalizes staged records and invokes existing structural validators. It does not mark objects as validated itself, does not run canonical publication, and cannot bypass deterministic or qualitative gates.</p>
        </section>
      </div>
    </main>
  );
}
