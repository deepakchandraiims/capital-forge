"use client";

import { useState } from "react";

type Result = Record<string, unknown> & { ok?: boolean; error?: string; readyToPublish?: number };

export default function ContentRemediateV3Page() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    if (!token.trim()) return;
    setBusy(true);
    setMessage("Running the direct 605-object quality review and publication gate…");
    setResult(null);
    try {
      const res = await fetch("/api/admin/content-quality-gate-v3", {
        method: "POST",
        headers: { "x-capital-forge-remediate": token.trim() },
      });
      const data = (await res.json()) as Result;
      setResult(data);
      if (!res.ok || !data.ok) throw new Error(data.error || "Quality gate failed");
      setMessage(
        data.readyToPublish === 605
          ? "Quality gate complete: all 605 objects are ready for canonical publication. Nothing was published yet."
          : `Quality gate complete. ${data.readyToPublish ?? 0} of 605 objects are ready for publication.`
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(token.trim()) && !busy;

  return (
    <main style={{ minHeight: "100vh", background: "#f6f8fc", padding: 36, color: "#101828", fontFamily: "Inter,ui-sans-serif,system-ui" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", borderRadius: 999, background: "#eaf2ff", color: "#1457d9", padding: "7px 11px", fontWeight: 800, fontSize: 12 }}>
          CAPITAL FORGE CONTENT OS · FINAL REVIEW
        </div>
        <h1 style={{ fontSize: 38, margin: "14px 0 8px", letterSpacing: "-.04em" }}>605-Object Quality Gate</h1>
        <p style={{ color: "#667085", lineHeight: 1.6 }}>
          The staging batch already has 605/605 structural validation and 204/204 deterministic calculation verification. This page runs the existing quality-review scoring policy directly from Supabase, so no JSON review file is required.
        </p>

        <section style={{ marginTop: 24, background: "white", border: "1px solid #e4e7ec", borderRadius: 22, padding: 24 }}>
          <label style={{ display: "grid", gap: 8, fontWeight: 800 }}>
            Temporary review-pass token
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              style={{ border: "1px solid #d0d5dd", borderRadius: 14, padding: 14 }}
            />
          </label>
          <button
            onClick={run}
            disabled={!ready}
            style={{ marginTop: 18, width: "100%", border: 0, borderRadius: 14, padding: "14px 18px", background: ready ? "#1769ff" : "#cfd8e8", color: "white", fontWeight: 900, cursor: ready ? "pointer" : "not-allowed" }}
          >
            {busy ? "Running quality gate…" : "Run Direct 605-Object Quality Gate →"}
          </button>
        </section>

        <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 }}>
          {[["605/605", "Structural validation"], ["204/204", "Calculation verification"], ["0", "Published before this step"]].map(([value, label]) => (
            <div key={label} style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}>
              <b style={{ display: "block", fontSize: 26, color: label.startsWith("Published") ? "#d92d20" : "#1769ff" }}>{value}</b>
              <span style={{ color: "#667085" }}>{label}</span>
            </div>
          ))}
        </section>

        {message && (
          <div style={{ marginTop: 20, padding: 16, borderRadius: 16, background: result?.ok ? "#ecfdf3" : "#fff8eb", border: `1px solid ${result?.ok ? "#abefc6" : "#fedf89"}` }}>
            {message}
          </div>
        )}

        {result && (
          <section style={{ marginTop: 20, background: "#101828", color: "#e6edf7", borderRadius: 20, padding: 20, overflow: "auto" }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.5 }}>{JSON.stringify(result, null, 2)}</pre>
          </section>
        )}

        <section style={{ marginTop: 20, border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 18, padding: 18 }}>
          <b style={{ color: "#b42318" }}>Publication lock remains active</b>
          <p style={{ color: "#667085", lineHeight: 1.6, marginBottom: 0 }}>
            This step inserts quality reviews and evaluates the publication gate only. It does not publish canonical questions or cases.
          </p>
        </section>
      </div>
    </main>
  );
}
