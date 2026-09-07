"use client";

import { useLayoutEffect, useState } from "react";

const ACTIVE_USER_KEY = "capital-forge-active-browser-user-v1";
const SCOPED_MARKER = "::user::";

function isCapitalForgeKey(key: string) {
  return key.startsWith("capital-forge-")
    && key !== ACTIVE_USER_KEY
    && !key.includes(SCOPED_MARKER)
    && !key.startsWith("capital-forge-auth-migration-v1-");
}

function scopedKey(key: string, userId: string) {
  return `${key}${SCOPED_MARKER}${userId}`;
}

function unscopedKeys() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && isCapitalForgeKey(key)) keys.push(key);
  }
  return keys;
}

function scopedKeysFor(userId: string) {
  const suffix = `${SCOPED_MARKER}${userId}`;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith("capital-forge-") && key.endsWith(suffix)) keys.push(key);
  }
  return keys;
}

function saveWorkspace(userId: string) {
  for (const key of unscopedKeys()) {
    const value = localStorage.getItem(key);
    if (value !== null) localStorage.setItem(scopedKey(key, userId), value);
  }
}

function clearWorkspace() {
  for (const key of unscopedKeys()) localStorage.removeItem(key);
}

function restoreWorkspace(userId: string) {
  clearWorkspace();
  const suffix = `${SCOPED_MARKER}${userId}`;
  for (const storedKey of scopedKeysFor(userId)) {
    const baseKey = storedKey.slice(0, -suffix.length);
    const value = localStorage.getItem(storedKey);
    if (value !== null) localStorage.setItem(baseKey, value);
  }
}

export default function AccountStorageBoundary({
  profileId,
  role,
  children
}: {
  profileId: string | null;
  role: string | null;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    try {
      if (!profileId) {
        setReady(true);
        return;
      }

      const previousUserId = localStorage.getItem(ACTIVE_USER_KEY);

      if (previousUserId && previousUserId !== profileId) {
        saveWorkspace(previousUserId);
        restoreWorkspace(profileId);
      } else if (!previousUserId) {
        // Only the original administrator may inherit pre-authentication browser state.
        // Every ordinary member starts from an empty local workspace and then loads
        // only server data owned by their Supabase user id.
        if (role === "admin") saveWorkspace(profileId);
        else restoreWorkspace(profileId);
      } else {
        const hasScopedCopy = scopedKeysFor(profileId).length > 0;
        if (!hasScopedCopy) saveWorkspace(profileId);
      }

      localStorage.setItem(ACTIVE_USER_KEY, profileId);
    } catch {
      // If storage is unavailable, Supabase/server-side account isolation still applies.
    } finally {
      setReady(true);
    }
  }, [profileId, role]);

  if (!ready && profileId) {
    return <main className="cf-auth-page"><section className="cf-auth-card"><p>Loading your Capital Forge account…</p></section></main>;
  }

  return <>{children}</>;
}
