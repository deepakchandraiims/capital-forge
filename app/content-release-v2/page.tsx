"use client";

import { useState } from "react";

type Status = {
  ok?: boolean;
  error?: string;
  batchId?: string;
  batchName?: string;
  batchStatus?: string;
  originalFilename?: string;
  stagedObjects?: number;
  expectedObjects?: number;
  calculations?: number;
  calculationsPassed?: number;
  reviews?: number;
  reviewModel?: string;
  summary?: {
    byValidation?: Record<string, number>;
    byDeterministic?: Record<string, number>;
    byPublication?: Record<string, number>;
    byType?: Record<string, number>;
  };
  canonical?: { questions?: number; cases?: number; total?: number };
  readyForPublish?: boolean;
  fullyPublished?: boolean;
};

type ApiResult = Status & {
  action?: string;
  processed?: number;
  nextOffset?: number;
  done?: boolean;
  failed?: any[];
  status?: Status;
  message?: string;
};

const DEFAULT_BATCH = "CF-V2-2000-20260905-001";

export default function ContentReleaseV2Page() {
  const [secret, setSecret] = useState("");
  const [batchName, setBatchName] = useState(DEFAULT_BATCH);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("Ready to inspect the staged V2 batch.");
  const [rawResult, setRawResult] = useState<any>(null);

  async function call(action: string, extra: Record<string, any> = {}) {
    const response = await fetch("/api/admin/content-release-v2", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-capital-forge-admin": secret.trim(),
      },
      body: JSON.stringify({ action, batchName: batchName.trim(), ...extra }),
    });
    const text = await response.text();
    let data: ApiResult;
    try { data = JSON.parse(text); }
    catch { throw new Error(`HTTP ${response.status}: ${text.replace(/\s+/g, " ").slice(0, 280)}`); }
    setRawResult(data);
    if (!response.ok || data.ok === false) throw new Error(data.error || `${action} failed.`);
    const nextStatus = data.status || data;
    if (nextStatus?.stagedObjects !== undefined) setStatus(nextStatus);
    return data;
  }

  async function refresh() {
    if (!secret.trim()) return;
    setBusy(true);
    setPhase("Reading release status…");
    try {
      const data = await call("status");
      setStatus(data);
      setPhase("Status refreshed.");
    } catch (e) { setPhase(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function runChecks() {
    if (!secret.trim()) return;
    setBusy(true);
    setRawResult(null);
    try {
      setPhase("1/4 · Running structural validation across all 2,000 objects…");
      await call("validate");

      setPhase("2/4 · Recomputing all calculation objects in the database…");
      let offset = 0;
      while (true) {
        const data = await call("verify_calculations", { offset });
        if (data.done) break;
        offset = Number(data.nextOffset || offset + Number(data.processed || 0));
      }

      setPhase("3/4 · Recording the Capital Forge V2 remediation QA review…");
      offset = 0;
      while (true) {
        const data = await call("review", { offset });
        if (data.done) break;
        offset = Number(data.nextOffset || offset + Number(data.processed || 0));
      }

      setPhase("4/4 · Running the database publication gate on all 2,000 objects…");
      offset = 0;
      while (true) {
        const data = await call("gate", { offset });
        if (data.done) break;
        offset = Number(data.nextOffset || offset + Number(data.processed || 0));
      }

      const finalStatus = await call("status");
      setStatus(finalStatus);
      setPhase(finalStatus.readyForPublish
        ? "All release checks completed. The batch is ready for canonical publication."
        : "Checks completed, but the database gate blocked one or more objects. Review the status below before publishing.");
    } catch (e) {
      setPhase(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function publishAll() {
    if (!secret.trim() || !status?.readyForPublish) return;
    if (!window.confirm("Publish all ready objects from CF-V2-2000-20260905-001 into the canonical Capital Forge tables?")) return;
    setBusy(true);
    setRawResult(null);
    try {
      setPhase("Publishing canonical objects in protected batches…");
      let rounds = 0;
      while (rounds < 160) {
        const data = await call("publish");
        rounds += 1;
        const s = data.status || status;
        const published = Number(s?.summary?.byPublication?.published || 0);
        setPhase(`Publishing… ${published.toLocaleString()} / 2,000 canonical objects linked.`);
        if (data.done || s?.fullyPublished) break;
      }
      const finalStatus = await call("status");
      setStatus(finalStatus);
      setPhase(finalStatus.fullyPublished
        ? "Publication complete. All 2,000 objects are canonically linked and live for the Capital Forge content API."
        : "Publication stopped before full completion. Inspect the result below; the process is idempotent and can be resumed.");
    } catch (e) {
      setPhase(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const validation = status?.summary?.byValidation || {};
  const publication = status?.summary?.byPublication || {};
  const published = Number(publication.published || 0);
  const ready = Number(publication.ready_to_publish || 0);

  const card = (value: string | number, label: string) => (
    <div style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}>
      <b style={{ display: "block", fontSize: 27, color: "#1769ff" }}>{value}</b>
      <span style={{ color: "#667085" }}>{label}</span>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "#f6f8fc", padding: 36, color: "#101828", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "inline-flex", borderRadius: 999, background: "#eaf2ff", color: "#1457d9", padding: "7px 11px", fontWeight: 800, fontSize: 12 }}>CAPITAL FORGE CONTENT OS · RELEASE CONTROL</div>
          <h1 style={{ margin: "14px 0 6px", fontSize: 38, letterSpacing: "-.04em" }}>V2 Canonical Release</h1>
          <p style={{ color: "#667085", lineHeight: 1.6, maxWidth: 850 }}>Run the remaining database checks for the staged 2,000-object V2 batch, then publish only after the structural, deterministic and publication gates report the batch as ready.</p>
        </div>

        <section style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 22, padding: 24, boxShadow: "0 18px 50px rgba(16,24,40,.06)" }}>
          <div style={{ display: "grid", gap: 15 }}>
            <label style={{ display: "grid", gap: 7, fontWeight: 800 }}>Batch name<input value={batchName} onChange={(e) => setBatchName(e.target.value)} style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 13 }} /></label>
            <label style={{ display: "grid", gap: 7, fontWeight: 800 }}>Capital Forge admin secret<input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" placeholder="CAPITAL_FORGE_ADMIN_SECRET" style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 13 }} /></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={refresh} disabled={!secret.trim() || busy} style={{ border: "1px solid #b9c8e8", borderRadius: 14, padding: "14px 18px", fontWeight: 900, background: "white", color: "#1457d9", cursor: "pointer" }}>Refresh Status</button>
              <button onClick={runChecks} disabled={!secret.trim() || busy} style={{ border: 0, borderRadius: 14, padding: "14px 18px", fontWeight: 900, background: !secret.trim() || busy ? "#cfd8e8" : "#1769ff", color: "white", cursor: !secret.trim() || busy ? "not-allowed" : "pointer" }}>{busy ? "Working…" : "Run All Release Checks →"}</button>
            </div>
            <button onClick={publishAll} disabled={busy || !status?.readyForPublish || status?.fullyPublished} style={{ border: 0, borderRadius: 14, padding: "15px 18px", fontWeight: 950, background: status?.fullyPublished ? "#12b76a" : status?.readyForPublish && !busy ? "#101828" : "#d0d5dd", color: "white", cursor: status?.readyForPublish && !busy && !status?.fullyPublished ? "pointer" : "not-allowed" }}>{status?.fullyPublished ? "✓ 2,000 Objects Published" : status?.readyForPublish ? "Publish 2,000 Canonical Objects →" : "Publish Locked Until Gates Pass"}</button>
          </div>
        </section>

        <div style={{ marginTop: 18, borderRadius: 16, padding: 16, background: status?.fullyPublished ? "#ecfdf3" : "#fff8eb", border: `1px solid ${status?.fullyPublished ? "#abefc6" : "#fedf89"}`, color: "#344054" }}>{phase}</div>

        <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
          {card(status?.stagedObjects ?? "—", "Staged")}
          {card(`${status?.calculationsPassed ?? 0}/${status?.calculations ?? 0}`, "Calculations passed")}
          {card(status?.reviews ?? 0, "V2 QA reviews")}
          {card(`${published}/2000`, "Published")}
        </section>

        <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}>
            <b>Release state</b>
            <div style={{ marginTop: 12, color: "#667085", lineHeight: 1.8 }}>
              <div>Validated: <strong>{Number(validation.validated || 0).toLocaleString()}</strong></div>
              <div>Ready to publish: <strong>{ready.toLocaleString()}</strong></div>
              <div>Published lineage: <strong>{published.toLocaleString()}</strong></div>
              <div>Canonical questions: <strong>{Number(status?.canonical?.questions || 0).toLocaleString()}</strong></div>
              <div>Canonical cases: <strong>{Number(status?.canonical?.cases || 0).toLocaleString()}</strong></div>
            </div>
          </div>
          <div style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}>
            <b>Batch information</b>
            <div style={{ marginTop: 12, color: "#667085", lineHeight: 1.8 }}>
              <div>{status?.batchName || batchName}</div>
              <div>Status: <strong>{status?.batchStatus || "—"}</strong></div>
              <div>Importer file: <strong>{status?.originalFilename || "—"}</strong></div>
              <div>Review model: <strong>{status?.reviewModel || "—"}</strong></div>
            </div>
          </div>
        </section>

        {rawResult && <section style={{ marginTop: 18, background: "#101828", color: "#e6edf7", borderRadius: 20, padding: 20, maxHeight: 420, overflow: "auto" }}><pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.55 }}>{JSON.stringify(rawResult, null, 2)}</pre></section>}

        <section style={{ marginTop: 18, border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 18, padding: 18 }}>
          <b style={{ color: "#b42318" }}>Release safety</b>
          <p style={{ color: "#667085", lineHeight: 1.6, marginBottom: 0 }}>The Publish button stays disabled until every staged object is ready_to_publish or already published. The V2 QA review is explicitly recorded as internal automated remediation QA, not independent practitioner certification. Publication is idempotent and retains staging-to-canonical lineage.</p>
        </section>
      </div>
    </main>
  );
}
