import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

function contentAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function clientKey(v: unknown) {
  const s = String(v || "").trim();
  return /^[a-zA-Z0-9_-]{8,120}$/.test(s) ? s : "";
}
function term(v: unknown) { return String(v || "").replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 140); }
function num(v: unknown, fallback: number) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }

async function authUser() {
  const db = await createServerSupabase();
  const { data, error } = await db.auth.getUser();
  return { db, user: error ? null : data.user };
}

async function claimKey(db: any, key: string) {
  if (!key) return;
  const { error } = await db.rpc("cf003_claim_legacy_client_key", { p_client_key: key });
  if (error) throw error;
}

async function progressMap(db: any, userId: string, refs: string[]) {
  if (!userId || !refs.length) return new Map<string, any>();
  const { data } = await db.from("advanced_progress").select("object_ref,status,response_text,score,attempts,correct,confidence,last_activity_at,solved_at").eq("user_id", userId).in("object_ref", refs);
  return new Map((data || []).map((x: any) => [x.object_ref, x]));
}

async function allAdvancedProgress(db: any, userId: string) {
  if (!userId) return [] as any[];
  const rows: any[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 7000; from += pageSize) {
    const { data, error } = await db.from("advanced_progress").select("object_ref,status,score,attempts,response_text,last_activity_at,solved_at").eq("user_id", userId).order("last_activity_at", { ascending: false }).range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export async function GET(request: Request) {
  const content = contentAdmin();
  if (!content) return NextResponse.json({ ok: false, error: "Advanced database is not configured." }, { status: 503 });
  const { db, user } = await authUser();
  if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });

  const u = new URL(request.url);
  const action = u.searchParams.get("action") || "manifest";
  const key = clientKey(u.searchParams.get("clientKey"));
  try { await claimKey(db, key); } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not claim legacy progress." }, { status: 409 }); }

  if (action === "manifest") {
    const rows: any[] = [];
    const pageSize = 1000;
    for (let from = 0; from < 7000; from += pageSize) {
      const { data, error } = await content.from("advanced_objects").select("id,module_number,module,difficulty_band,content_type,object_id").eq("status", "published").order("object_id").range(from, from + pageSize - 1);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      rows.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    let progress: any[] = [];
    try { progress = await allAdvancedProgress(db, user.id); } catch { progress = []; }
    const refs = progress.map((x) => x.object_ref);
    const moduleByRef = new Map<string, number>();
    if (refs.length) {
      for (let i = 0; i < refs.length; i += 500) {
        const { data } = await content.from("advanced_objects").select("id,module_number").in("id", refs.slice(i, i + 500));
        for (const x of data || []) moduleByRef.set(x.id, x.module_number);
      }
    }
    const modules = new Map<number, any>();
    for (const r of rows) {
      const m = modules.get(r.module_number) || { module_number: r.module_number, module: r.module, count: 0, difficulty: { A: 0, B: 0, C: 0, D: 0, E: 0 }, content_types: {} as Record<string, number> };
      m.count += 1;
      m.difficulty[r.difficulty_band] = (m.difficulty[r.difficulty_band] || 0) + 1;
      m.content_types[r.content_type] = (m.content_types[r.content_type] || 0) + 1;
      modules.set(r.module_number, m);
    }
    const pByModule = new Map<number, any>();
    for (const p of progress) {
      const mn = moduleByRef.get(p.object_ref); if (!mn) continue;
      const x = pByModule.get(mn) || { opened: 0, solved: 0, mastered: 0, attempts: 0, scoreSum: 0, scoreN: 0 };
      x.opened += 1;
      if (p.status === "solved" || p.status === "mastered") x.solved += 1;
      if (p.status === "mastered") x.mastered += 1;
      x.attempts += Number(p.attempts || 0);
      if (p.score != null) { x.scoreSum += Number(p.score); x.scoreN += 1; }
      pByModule.set(mn, x);
    }
    const moduleList = Array.from(modules.values()).sort((a,b)=>a.module_number-b.module_number).map((m) => {
      const p = pByModule.get(m.module_number) || { opened: 0, solved: 0, mastered: 0, attempts: 0, scoreSum: 0, scoreN: 0 };
      return { ...m, progress: { opened: p.opened, solved: p.solved, mastered: p.mastered, attempts: p.attempts, average_score: p.scoreN ? Math.round(p.scoreSum / p.scoreN) : 0, completion_pct: Math.round((p.solved / Math.max(1, m.count)) * 100) } };
    });
    return NextResponse.json({ ok: true, dataset: { total: rows.length, modules: moduleList.length, objects_per_module: moduleList.length ? Math.min(...moduleList.map((m)=>m.count)) : 0 }, modules: moduleList });
  }

  if (action === "list") {
    const moduleNumber = Math.max(0, Math.min(25, num(u.searchParams.get("module"), 0)));
    const difficulty = term(u.searchParams.get("difficulty"));
    const contentType = term(u.searchParams.get("contentType"));
    const q = term(u.searchParams.get("q"));
    const page = Math.max(1, num(u.searchParams.get("page"), 1));
    const limit = Math.min(50, Math.max(10, num(u.searchParams.get("limit"), 24)));
    const from = (page - 1) * limit;
    let query = content.from("advanced_objects").select("id,object_id,module_number,module,subtopic,content_type,difficulty_band,professional_level,estimated_minutes,role,geography,deal_size_band,source_kind,quality_score,prompt", { count: "exact" }).eq("status", "published");
    if (moduleNumber) query = query.eq("module_number", moduleNumber);
    if (difficulty && ["A","B","C","D","E"].includes(difficulty)) query = query.eq("difficulty_band", difficulty);
    if (contentType) query = query.eq("content_type", contentType);
    if (q) query = query.or(`prompt.ilike.%${q}%,subtopic.ilike.%${q}%,module.ilike.%${q}%,role.ilike.%${q}%`);
    const { data, count, error } = await query.order("object_id").range(from, from + limit - 1);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const pMap = await progressMap(db, user.id, (data || []).map((x: any) => x.id));
    return NextResponse.json({ ok: true, objects: (data || []).map((x: any) => ({ ...x, progress: pMap.get(x.id) || null })), pagination: { page, limit, total: count || 0, pages: Math.max(1, Math.ceil((count || 0) / limit)) } });
  }

  if (action === "object") {
    const objectId = term(u.searchParams.get("id"));
    const { data: object, error } = await content.from("advanced_objects").select("*").eq("status", "published").eq("object_id", objectId).maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!object) return NextResponse.json({ ok: false, error: "Advanced object not found." }, { status: 404 });
    const { data: progress } = await db.from("advanced_progress").select("*").eq("user_id", user.id).eq("object_ref", object.id).maybeSingle();
    return NextResponse.json({ ok: true, object: { ...object, ...object.raw, internal_ref: object.id }, progress: progress || null });
  }

  if (action === "analytics") {
    let rows:any[]=[]; try { rows = await allAdvancedProgress(db,user.id); } catch { rows=[]; }
    const refs = rows.slice(0, 20).map((x) => x.object_ref);
    const { data: objs } = refs.length ? await content.from("advanced_objects").select("id,object_id,module_number,module,subtopic,difficulty_band").in("id", refs) : { data: [] as any[] };
    const om = new Map((objs || []).map((x: any) => [x.id, x]));
    const scored = rows.filter((x) => x.score != null);
    return NextResponse.json({ ok: true, analytics: { opened: rows.length, solved: rows.filter((x) => x.status === "solved" || x.status === "mastered").length, mastered: rows.filter((x) => x.status === "mastered").length, attempts: rows.reduce((n, x) => n + Number(x.attempts || 0), 0), average_score: scored.length ? Math.round(scored.reduce((n, x) => n + Number(x.score || 0), 0) / scored.length) : 0, recent: rows.slice(0, 12).map((x) => ({ ...om.get(x.object_ref), progress: x })).filter((x) => x.id) } });
  }

  return NextResponse.json({ ok: false, error: "Unknown Advanced action." }, { status: 400 });
}

export async function POST(request: Request) {
  const content = contentAdmin();
  if (!content) return NextResponse.json({ ok: false, error: "Advanced database is not configured." }, { status: 503 });
  const { db, user } = await authUser();
  if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const key = clientKey(body.clientKey);
  try { await claimKey(db, key); } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not claim legacy progress." }, { status: 409 }); }

  if (action === "reset") {
    await db.from("advanced_sessions").delete().eq("user_id", user.id);
    const { error } = await db.from("advanced_progress").delete().eq("user_id", user.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, reset: true });
  }

  const objectId = term(body.objectId);
  const { data: object } = await content.from("advanced_objects").select("id,object_id").eq("status", "published").eq("object_id", objectId).maybeSingle();
  if (!object) return NextResponse.json({ ok: false, error: "Object not found." }, { status: 404 });
  const { data: existing } = await db.from("advanced_progress").select("*").eq("user_id", user.id).eq("object_ref", object.id).maybeSingle();
  const now = new Date().toISOString();
  const row: any = existing ? { ...existing } : { user_id: user.id, client_key: key || null, object_ref: object.id, status: "opened", attempts: 0, first_opened_at: now };
  row.user_id = user.id;
  if (!row.client_key && key) row.client_key = key;
  row.last_activity_at = now; row.updated_at = now;
  if (action === "open") row.status = row.status || "opened";
  else if (action === "save") { row.response_text = String(body.response || "").slice(0, 50000); if (row.status === "opened") row.status = "attempted"; }
  else if (action === "solve") {
    row.response_text = String(body.response ?? row.response_text ?? "").slice(0, 50000);
    row.score = Math.max(0, Math.min(100, num(body.score, 0)));
    row.confidence = Math.max(1, Math.min(5, num(body.confidence, 3)));
    row.attempts = Number(row.attempts || 0) + 1;
    row.correct = row.score >= 70;
    row.status = row.score >= 90 ? "mastered" : "solved";
    row.solved_at = now;
  } else return NextResponse.json({ ok: false, error: "Unknown Advanced write action." }, { status: 400 });

  delete row.id;
  let saved: any = null;
  if (existing?.id) {
    const { data, error } = await db.from("advanced_progress").update(row).eq("id", existing.id).eq("user_id", user.id).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); saved = data;
  } else {
    const { data, error } = await db.from("advanced_progress").insert(row).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); saved = data;
  }
  return NextResponse.json({ ok: true, progress: saved });
}
