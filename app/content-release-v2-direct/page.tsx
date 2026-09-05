"use client";

import { useEffect, useState } from "react";

type Status = {
  ok?: boolean;
  error?: string;
  batchName?: string;
  batchStatus?: string;
  stagedObjects?: number;
  expectedObjects?: number;
  calculations?: number;
  calculationsPassed?: number;
  reviews?: number;
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

export default function DirectV2ReleasePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("Reading the fixed V2 batch status…");
  const [raw, setRaw] = useState<any>(null);

  async function call(action: string, extra: Record<string, any> = {}) {
    const response = await fetch("/api/content-release-v2-direct", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const text = await response.text();
    let data: ApiResult;
    try { data = JSON.parse(text); }
    catch { throw new Error(`HTTP ${response.status}: ${text.replace(/\s+/g, " ").slice(0, 260)}`); }
    setRaw(data);
    if (!response.ok || data.ok === false) throw new Error(data.error || `${action} failed.`);
    const s = data.status || data;
    if (s.stagedObjects !== undefined) setStatus(s);
    return data;
  }

  async function refresh() {
    try {
      const data = await call("status");
      setStatus(data);
      setPhase(data.fullyPublished ? "All 2,000 V2 objects are already live." : `${Number(data.stagedObjects || 0).toLocaleString()} / 2,000 objects staged.`);
    } catch (e) { setPhase(e instanceof Error ? e.message : String(e)); }
  }

  useEffect(() => { refresh(); }, []);

  async function runAll() {
    setBusy(true);
    setRaw(null);
    try {
      setPhase("1/5 · Structural validation across all 2,000 objects…");
      await call("validate");

      setPhase("2/5 · Deterministic verification of calculation objects…");
      let offset = 0;
      while (true) {
        const data = await call("verify_calculations", { offset });
        if (data.done) break;
        offset = Number(data.nextOffset || offset + Number(data.processed || 0));
      }

      setPhase("3/5 · Recording V2 remediation QA reviews…");
      offset = 0;
      while (true) {
        const data = await call("review", { offset });
        if (data.done) break;
        offset = Number(data.nextOffset || offset + Number(data.processed || 0));
      }

      setPhase("4/5 · Running publication gate…");
      offset = 0;
      while (true) {
        const data = await call("gate", { offset });
        if (data.done) break;
        offset = Number(data.nextOffset || offset + Number(data.processed || 0));
      }

      const checked = await call("status");
      setStatus(checked);
      if (!checked.readyForPublish && !checked.fullyPublished) throw new Error("Database gate did not mark all 2,000 objects ready. Publication stopped safely.");

      setPhase("5/5 · Publishing canonical objects…");
      let rounds = 0;
      while (rounds < 170) {
        const data = await call("publish");
        rounds += 1;
        const s = data.status || status;
        const published = Number(s?.summary?.byPublication?.published || 0);
        setPhase(`5/5 · Publishing… ${published.toLocaleString()} / 2,000 linked.`);
        if (data.done || s?.fullyPublished) break;
      }

      const finalStatus = await call("status");
      setStatus(finalStatus);
      setPhase(finalStatus.fullyPublished
        ? "✓ Publication complete. All 2,000 V2 objects are canonically linked and live."
        : "Publication paused before completion. The process is idempotent; press the button again to resume safely.");
    } catch (e) {
      setPhase(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const publication = status?.summary?.byPublication || {};
  const validation = status?.summary?.byValidation || {};
  const published = Number(publication.published || 0);
  const ready = Number(publication.ready_to_publish || 0);
  const staged = Number(status?.stagedObjects || 0);
  const canRun = staged === 2000 && !busy && !status?.fullyPublished;

  const card = (value: string | number, label: string) => (
    <div style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}>
      <b style={{ display: "block", fontSize: 28, color: "#1769ff" }}>{value}</b>
      <span style={{ color: "#667085" }}>{label}</span>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "#f6f8fc", padding: 36, color: "#101828", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "inline-flex", borderRadius: 999, background: "#eaf2ff", color: "#1457d9", padding: "7px 11px", fontWeight: 800, fontSize: 12 }}>CAPITAL FORGE · FIXED V2 RELEASE</div>
          <h1 style={{ margin: "14px 0 6px", fontSize: 38, letterSpacing: "-.04em" }}>Publish V2 Without Admin Key</h1>
          <p style={{ color: "#667085", lineHeight: 1.6, maxWidth: 840 }}>This one-time release control is locked to batch <strong>CF-V2-2000-20260905-001</strong>. It cannot publish another batch and it refuses publication unless exactly 2,000 CF2 objects pass the existing structural, calculation and publication gates.</p>
        </div>

        <section style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 22, padding: 24, boxShadow: "0 18px 50px rgba(16,24,40,.06)" }}>
          <button onClick={runAll} disabled={!canRun} style={{ width: "100%", border: 0, borderRadius: 14, padding: "16px 18px", fontWeight: 950, fontSize: 16, background: status?.fullyPublished ? "#12b76a" : canRun ? "#1769ff" : "#cfd8e8", color: "white", cursor: canRun ? "pointer" : "not-allowed" }}>
            {status?.fullyPublished ? "✓ All 2,000 Objects Published" : busy ? "Running release pipeline…" : staged === 2000 ? "Run Checks & Publish 2,000 Objects →" : `Upload remaining objects first (${staged}/2000 staged)`}
          </button>
          <button onClick={refresh} disabled={busy} style={{ width: "100%", marginTop: 10, border: "1px solid #b9c8e8", borderRadius: 14, padding: "13px 18px", fontWeight: 850, background: "white", color: "#1457d9" }}>Refresh Status</button>
        </section>

        <div style={{ marginTop: 18, borderRadius: 16, padding: 16, background: status?.fullyPublished ? "#ecfdf3" : "#fff8eb", border: `1px solid ${status?.fullyPublished ? "#abefc6" : "#fedf89"}`, color: "#344054" }}>{phase}</div>

        <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
          {card(`${staged}/2000`, "Staged")}
          {card(`${status?.calculationsPassed ?? 0}/${status?.calculations ?? 0}`, "Calculations passed")}
          {card(status?.reviews ?? 0, "V2 QA reviews")}
          {card(`${published}/2000`, "Published")}
        </section>

        <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}>
            <b>Release state</b>
            <div style={{ marginTop: 12, color: "#667085", lineHeight: 1.8 }}>
              <div>Validated: <strong>{Number(validation.validated || 0).toLocaleString()}</strong></div>
              <div>Ready: <strong>{ready.toLocaleString()}</strong></div>
              <div>Published lineage: <strong>{published.toLocaleString()}</strong></div>
              <div>Canonical total: <strong>{Number(status?.canonical?.total || 0).toLocaleString()}</strong></div>
            </div>
          </div>
          <div style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}>
            <b>Safety</b>
            <div style={{ marginTop: 12, color: "#667085", lineHeight: 1.7 }}>Fixed batch only. Exact 2,000-object count required. CF2 namespace required. Existing database gates remain active. Publication is idempotent and retains staging-to-canonical lineage.</div>
          </div>
        </section>

        {raw && <section style={{ marginTop: 18, background: "#101828", color: "#e6edf7", borderRadius: 20, padding: 20, maxHeight: 420, overflow: "auto" }}><pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.55 }}>{JSON.stringify(raw, null, 2)}</pre></section>}
      </div>
    </main>
  );
}
