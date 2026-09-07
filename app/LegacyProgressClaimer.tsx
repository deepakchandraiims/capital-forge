"use client";

import { useEffect } from "react";
import { useAuthProfile } from "./AuthProvider";

function readJson(key: string) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function LegacyProgressClaimer() {
  const profile = useAuthProfile();

  useEffect(() => {
    if (!profile || profile.status !== "approved") return;
    const migrationKey = `capital-forge-auth-migration-v1-${profile.id}`;
    if (localStorage.getItem(migrationKey)) return;

    let cancelled = false;
    (async () => {
      const clientKeys = [
        localStorage.getItem("capital-forge-kv-client-v1"),
        localStorage.getItem("capital-forge-advanced-client-v1")
      ].filter(Boolean);

      if (clientKeys.length) {
        const claim = await fetch("/api/auth/claim", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientKeys })
        });
        if (!claim.ok) return;
      }

      let attempts = readJson("capital-forge-canonical-practice-v1");
      if (!Array.isArray(attempts)) {
        const legacyStores = [
          readJson("capital-forge-practice-workstation-fixed-v3"),
          readJson("capital-forge-prepmate-live-v2"),
          readJson("capital-forge-practice-workstation-v1")
        ];
        attempts = legacyStores.find((x) => Array.isArray(x?.attempts))?.attempts || [];
      }

      const bookmarks = readJson("capital-forge-practice-bookmarks-v1");
      const state = {
        dashboardGoal: readJson("capital-forge-dashboard-goal-v1"),
        focusPractice: readJson("capital-forge-focus-practice-v1"),
        interviewSessions: readJson("capital-forge-interview-sessions-v1"),
        interviewSettings: readJson("capital-forge-interview-settings-v1"),
        activeInterview: readJson("capital-forge-active-interview-v1")
      };

      const imported = await fetch("/api/user-progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "importLegacy",
          attempts: Array.isArray(attempts) ? attempts : [],
          bookmarks: Array.isArray(bookmarks) ? bookmarks : [],
          state
        })
      });
      if (!imported.ok || cancelled) return;

      // Preservation marker only. Existing learning keys are intentionally never removed or cleared.
      localStorage.setItem(migrationKey, new Date().toISOString());
    })().catch(() => {});

    return () => { cancelled = true; };
  }, [profile]);

  return null;
}
