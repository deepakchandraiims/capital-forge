"use client";

import { useState } from "react";

type PublishResult = {
  ok?: boolean;
  error?: string;
  stage?: string;
  batchId?: string;
  newlyPublished?: number;
  alreadyPublished?: number;
  canonicalLinked?: number;
  publishedByType?: Record<string, number>;
  remainingUnlinked?: number;
  remainingSample?: unknown[];
  note?: string;
  [key: string]: unknown;
};

export default function ContentPublishPage() {
  const [token, setToken] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<PublishResult | null>(null);

  const armed = token.trim().length > 0 && confirm.trim() === "PUBLISH_605" && !busy;

  async function publish() {
    if (!armed) return;
    setBusy(true);
    setResult(null);
    setMessage("Running final pre-flight checks before canonical publication…");

    try {
      const response = await fetch("/api/admin/content-publish-import-v1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-capital-forge-remediate": token.trim(),
        },
        body: JSON.stringify({ confirm: "PUBLISH_605" }),
      });

      const data = (await response.json()) as PublishResult;
      setResult(data);
      if (!response.ok || !data.ok) {
        throw new Error(data.error || data.note || "Canonical publication did not complete.");
      }

      setMessage("Canonical publication complete: all 605 objects are published and lineage-linked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f6f8fc", padding: 36, color: "#101828", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", borderRadius: 999, background: "#eaf2ff", color: "#1457d9", padding: "7px 11px", fontWeight: 800, fontSize: 12 }}>
          CAPITAL FORGE CONTENT OS · FINAL PUBLICATION
        </div>

        <h1 style={{ margin: "14px 0 8px", fontSize: 38, letterSpacing: "-.04em" }}>Publish 605 Canonical Objects</h1>
        <p style={{ color: "#667085", lineHeight: 1.65, maxWidth: 780 }}>
          The reviewed batch has passed structural validation, deterministic calculation verification, and the publication gate. This final action writes the approved objects into the canonical Capital Forge tables and links every canonical row back to staging.
        </p>

        <section style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
          {[["605", "Ready"], ["497", "Questions"], ["105", "Cases"], ["3", "Interview"]].map(([value, label]) => (
            <div key={label} style={{ background: "white", border: "1px solid #e4e7ec", borderRadius: 18, padding: 18 }}>
              <b style={{ display: "block", fontSize: 28, color: "#1769ff" }}>{value}</b>
              <span style={{ color: "#667085" }}>{label}</span>
            </div>
          ))}
        </section>

        <section style={{ marginTop: 20, background: "white", border: "1px solid #e4e7ec", borderRadius: 22, padding: 24, boxShadow: "0 18px 50px rgba(16,24,40,.06)" }}>
          <div style={{ display: "grid", gap: 18 }}>
            <label style={{ display: "grid", gap: 8, fontWeight: 800 }}>
              Temporary review-pass token
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" style={{ border: "1px solid #d0d5dd", borderRadius: 14, padding: 14 }} />
            </label>

            <label style={{ display: "grid", gap: 8, fontWeight: 800 }}>
              Final confirmation
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type PUBLISH_605" autoComplete="off" style={{ border: "1px solid #d0d5dd", borderRadius: 14, padding: 14 }} />
              <small style={{ color: "#667085", fontWeight: 500 }}>Type exactly: PUBLISH_605</small>
            </label>

            <button onClick={publish} disabled={!armed} style={{ border: 0, borderRadius: 14, padding: "15px 18px", fontWeight: 900, background: armed ? "#1769ff" : "#cfd8e8", color: "white", cursor: armed ? "pointer" : "not-allowed" }}>
              {busy ? "Publishing canonical objects…" : "Publish All 605 Canonical Objects →"}
            </button>
          </div>
        </section>

        <section style={{ marginTop: 18, border: "1px solid #fedf89", background: "#fffaeb", borderRadius: 18, padding: 18 }}>
          <b style={{ color: "#93370d" }}>Final database write</b>
          <p style={{ color: "#667085", lineHeight: 1.6, marginBottom: 0 }}>
            Before writing, the server rechecks all 605 publication decisions, all 605 structural states, the exact 497 / 105 / 3 type split, all 204 calculation validations, and both canonical publisher functions. The publisher is lineage-based and idempotent, so a safe retry skips rows that are already linked.
          </p>
        </section>

        {message && (
          <div style={{ marginTop: 20, borderRadius: 16, padding: 16, background: result?.ok ? "#ecfdf3" : "#fff8eb", border: `1px solid ${result?.ok ? "#abefc6" : "#fedf89"}`, color: "#344054" }}>
            {message}
          </div>
        )}

        {result && (
          <section style={{ marginTop: 20, background: "#101828", color: "#e6edf7", borderRadius: 20, padding: 20, overflow: "auto" }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.55 }}>{JSON.stringify(result, null, 2)}</pre>
          </section>
        )}
      </div>
    </main>
  );
}
