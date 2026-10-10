"use client";

// Private progress never goes into shared CDN caches or localStorage.
// Entries are scoped by the authenticated user id and expire quickly.
export type KVObjectPayload = {
  ok: boolean;
  object: Record<string, any>;
  sources: Record<string, any>[];
  progress?: Record<string, any> | null;
};

const MAX_ITEMS = 60;
const TTL_MS = 2 * 60 * 1000;
const resolved = new Map<string, { at: number; value: KVObjectPayload }>();
const inflight = new Map<string, Promise<KVObjectPayload>>();

function keyFor(id: string, userId: string) {
  return `${userId}:${id}`;
}

export function cachedKVObject(id: string, userId: string): KVObjectPayload | null {
  if (!id || !userId) return null;
  const key = keyFor(id, userId);
  const hit = resolved.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    resolved.delete(key);
    return null;
  }
  return hit.value;
}

export async function loadKVObject(id: string, userId: string): Promise<KVObjectPayload> {
  const existing = cachedKVObject(id, userId);
  if (existing) return existing;
  const key = keyFor(id, userId);
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const response = await fetch(`/api/knowledge-vault?action=object&id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok || !data.object) throw new Error(data.error || "Unable to load this lesson.");
    const payload: KVObjectPayload = {
      ok: true,
      object: data.object,
      sources: Array.isArray(data.sources) ? data.sources : [],
      progress: data.progress || null
    };
    resolved.set(key, { at: Date.now(), value: payload });
    if (resolved.size > MAX_ITEMS) resolved.delete(resolved.keys().next().value as string);
    return payload;
  })();
  inflight.set(key, promise);
  try { return await promise; }
  finally { inflight.delete(key); }
}

export function prefetchKVObject(id: string, userId: string) {
  if (!id || !userId || cachedKVObject(id, userId)) return;
  void loadKVObject(id, userId).catch(() => {});
}

export function updateCachedKVProgress(id: string, userId: string, progress: Record<string, any>) {
  const key = keyFor(id, userId);
  const hit = resolved.get(key);
  if (hit) resolved.set(key, { at: Date.now(), value: { ...hit.value, progress } });
}
