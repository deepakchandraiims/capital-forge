"use client";

type Question = Record<string, any>;

// Published, shared canonical questions only. No user answer history is cached.
const ready = new Map<string, { at: number; question: Question }>();
const pending = new Map<string, Promise<Question>>();
const TTL = 10 * 60 * 1000;
const MAX = 75;

export function cachedQuestion(id: string): Question | null {
  const found = ready.get(id);
  if (!found) return null;
  if (Date.now() - found.at >= TTL) { ready.delete(id); return null; }
  return found.question;
}

export async function loadQuestion(id: string): Promise<Question> {
  const hit = cachedQuestion(id);
  if (hit) return hit;
  const waiting = pending.get(id);
  if (waiting) return waiting;
  const promise = (async () => {
    const response = await fetch("/api/content?type=practice&id=" + encodeURIComponent(id));
    const data = await response.json();
    if (!response.ok || !data.ok || !data.question) throw new Error(data.error || "Question unavailable.");
    ready.set(id, { at: Date.now(), question: data.question });
    if (ready.size > MAX) ready.delete(ready.keys().next().value as string);
    return data.question;
  })();
  pending.set(id, promise);
  try { return await promise; }
  finally { pending.delete(id); }
}

export function prefetchQuestion(id: string) {
  if (!id || cachedQuestion(id)) return;
  void loadQuestion(id).catch(() => {});
}
