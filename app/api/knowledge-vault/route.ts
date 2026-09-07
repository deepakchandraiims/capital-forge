import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

const UNIVERSES = [
  { name: "Technicals", slug: "technicals", categories: 10 },
  { name: "Market History", slug: "market-history", categories: 4 },
  { name: "Legendary Trades & Deals", slug: "legendary-trades-deals", categories: 5 },
  { name: "Crises & Events", slug: "crises-events", categories: 4 },
  { name: "Finance Facts", slug: "finance-facts", categories: 2 }
] as const;

const SESSION_FIELDS = "id,source_record_key,title,universe,category,category_slug,topic,subtopic,difficulty,content_type,question_type,prompt,answer,explanation,intuition,common_mistake,why_it_matters,pattern_to_remember,estimated_time_seconds,source_kind,quality_score,event_date,unique_or_variant,variant_of,variant_family_id";

function contentClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function cleanKey(value: string | null) {
  const raw = String(value || "").trim();
  return /^[a-zA-Z0-9_-]{8,120}$/.test(raw) ? raw : "";
}

function cleanTerm(value: string | null) {
  return String(value || "").replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

function isoAfter(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function authContext() {
  const db = await createServerSupabase();
  const { data, error } = await db.auth.getUser();
  return { db, user: error ? null : data.user };
}

async function claimLegacyKey(db: any, clientKey: string) {
  if (!clientKey) return;
  const { error } = await db.rpc("cf003_claim_legacy_client_key", { p_client_key: clientKey });
  if (error) throw error;
}

async function objectMap(content: ReturnType<typeof createClient>, ids: string[]) {
  if (!ids.length) return new Map<string, any>();
  const { data } = await content.from("knowledge_objects").select("id,source_record_key,title,universe,category,category_slug,topic,difficulty,content_type,question_type,estimated_time_seconds,source_kind,quality_score,event_date,status").in("id", ids).eq("status", "published");
  return new Map((data || []).map((row: any) => [row.id, row]));
}

export async function GET(request: Request) {
  const content = contentClient();
  if (!content) return NextResponse.json({ ok: false, error: "Supabase is not configured for Knowledge Vault." }, { status: 503 });
  const { db, user } = await authContext();
  if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });

  const requestUrl = new URL(request.url);
  const action = requestUrl.searchParams.get("action") || "landing";
  const clientKey = cleanKey(requestUrl.searchParams.get("clientKey"));
  try { await claimLegacyKey(db, clientKey); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not claim legacy progress." }, { status: 409 }); }

  if (action === "landing") {
    const [{ count: databaseObjects }, { data: featured }, { data: p }, { data: s }, { data: g }] = await Promise.all([
      content.from("knowledge_objects").select("id", { count: "exact", head: true }).eq("status", "published"),
      content.from("knowledge_objects").select("id,source_record_key,title,universe,category,category_slug,topic,difficulty,content_type,question_type,estimated_time_seconds,source_kind,quality_score,event_date").eq("status", "published").order("quality_score", { ascending: false, nullsFirst: false }).limit(8),
      db.from("knowledge_progress").select("object_id,status,attempt_count,correct_count,incorrect_count,mastery_score,bookmark,review_later,last_result,last_seen_at,next_review_at,response_saved,user_response,solved_at").eq("user_id", user.id),
      db.from("knowledge_sessions").select("id,mode,status,object_ids,current_index,last_activity_at").eq("user_id", user.id).order("last_activity_at", { ascending: false }).limit(10),
      db.from("knowledge_goals").select("id,goal_type,target,period,active").eq("user_id", user.id).eq("active", true).maybeSingle()
    ]);
    const progress = p || [];
    const sessions = s || [];
    const goal = g || null;
    const reviewed = progress.filter((x) => x.status && x.status !== "unseen").length;
    const mastered = progress.filter((x) => x.status === "mastered").length;
    const learningReview = progress.filter((x) => x.status === "learning" || x.status === "review").length;
    const attempts = progress.reduce((n, x) => n + Number(x.attempt_count || 0), 0);
    const correct = progress.reduce((n, x) => n + Number(x.correct_count || 0), 0);
    const due = progress.filter((x) => x.next_review_at && new Date(x.next_review_at) <= new Date()).length;
    const savedResponses = progress.filter((x) => x.response_saved).length;
    const recentProgress = [...progress].filter((x) => x.last_seen_at).sort((a, b) => String(b.last_seen_at).localeCompare(String(a.last_seen_at))).slice(0, 5);
    const recentMap = await objectMap(content, recentProgress.map((x) => x.object_id));
    const recent = recentProgress.map((x) => ({ ...recentMap.get(x.object_id), progress: x })).filter((x) => x.id);
    const activeSession = sessions.find((x) => x.status === "active") || null;

    return NextResponse.json({
      ok: true,
      serverTime: new Date().toISOString(),
      dataset: { expected: 3000, categories: 25, sourceGrounded: 1800, authored: 1200, unique: 2400, variants: 600, databaseObjects: databaseObjects || 0, readyForImport: (databaseObjects || 0) !== 3000 },
      universes: UNIVERSES,
      featured: featured || [],
      progress: { reviewed, mastered, learningReview, unseen: Math.max(0, 3000 - reviewed), recallAccuracy: attempts ? Math.round((correct / attempts) * 100) : 0, reviewDue: due, savedResponses },
      recent,
      activeSession,
      goal
    }, { headers: { "Cache-Control": "private, no-store" } });
  }

  if (action === "categories") {
    const universe = cleanTerm(requestUrl.searchParams.get("universe"));
    const rows: any[] = [];
    const pageSize = 1000;
    for (let from = 0; from < 4000; from += pageSize) {
      let query = content.from("knowledge_objects").select("source_record_key,category,category_slug,universe").eq("status", "published").order("source_record_key", { ascending: true }).range(from, from + pageSize - 1);
      if (universe) query = query.eq("universe", universe);
      const { data, error } = await query;
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      rows.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    const map = new Map<string, { name: string; slug: string; universe: string; count: number }>();
    for (const row of rows) {
      const key = String(row.category_slug);
      const current = map.get(key) || { name: String(row.category), slug: key, universe: String(row.universe), count: 0 };
      current.count += 1;
      map.set(key, current);
    }
    return NextResponse.json({ ok: true, categories: Array.from(map.values()).sort((a, b) => a.universe.localeCompare(b.universe) || a.name.localeCompare(b.name)) });
  }

  if (action === "object") {
    const id = requestUrl.searchParams.get("id");
    const key = requestUrl.searchParams.get("key");
    let query = content.from("knowledge_objects").select("*").eq("status", "published");
    query = id ? query.eq("id", id) : query.eq("source_record_key", key || "__missing__");
    const { data: object, error } = await query.maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!object) return NextResponse.json({ ok: false, error: "Knowledge object not found." }, { status: 404 });
    let sources: any[] = [];
    if (Array.isArray(object.source_ids) && object.source_ids.length) {
      const { data } = await content.from("cf_sources").select("id,publisher,title,url,source_type,document_date,authority_tier,notes").in("id", object.source_ids);
      sources = data || [];
    }
    const { data: progress } = await db.from("knowledge_progress").select("*").eq("user_id", user.id).eq("object_id", object.id).maybeSingle();
    return NextResponse.json({ ok: true, object, sources, progress: progress || null }, { headers: { "Cache-Control": "private, no-store" } });
  }

  if (action === "list" || action === "timeline") {
    const universe = cleanTerm(requestUrl.searchParams.get("universe"));
    const category = cleanTerm(requestUrl.searchParams.get("category"));
    const contentType = cleanTerm(requestUrl.searchParams.get("contentType"));
    const q = cleanTerm(requestUrl.searchParams.get("q"));
    const limit = Math.min(50, Math.max(1, Number(requestUrl.searchParams.get("limit") || 24)));
    let query = content.from("knowledge_objects").select("id,source_record_key,title,universe,category,category_slug,topic,subtopic,difficulty,content_type,question_type,estimated_time_seconds,source_kind,quality_score,event_date,tags").eq("status", "published");
    if (action === "timeline") query = query.not("event_date", "is", null).order("event_date", { ascending: false });
    else query = query.order("quality_score", { ascending: false, nullsFirst: false });
    if (universe) query = query.eq("universe", universe);
    if (category) query = query.eq("category_slug", category);
    if (contentType) query = query.eq("content_type", contentType);
    if (q) query = query.or(`title.ilike.%${q}%,topic.ilike.%${q}%,subtopic.ilike.%${q}%,category.ilike.%${q}%`);
    const { data, error } = await query.limit(limit);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, objects: data || [] });
  }

  if (action === "session-objects") {
    const count = Math.min(50, Math.max(1, Number(requestUrl.searchParams.get("count") || 10)));
    const universe = cleanTerm(requestUrl.searchParams.get("universe"));
    const category = cleanTerm(requestUrl.searchParams.get("category"));
    const onlyUnseen = requestUrl.searchParams.get("unseen") === "1";
    const { data: p } = await db.from("knowledge_progress").select("object_id,status,next_review_at").eq("user_id", user.id);
    const rows = p || [];
    const exclude = onlyUnseen ? rows.map((x) => x.object_id) : [];
    const dueIds = rows.filter((x) => x.next_review_at && new Date(x.next_review_at) <= new Date()).map((x) => x.object_id);
    let due: any[] = [];
    if (dueIds.length) {
      let dueQuery = content.from("knowledge_objects").select(SESSION_FIELDS).eq("status", "published").in("id", dueIds.slice(0, 200));
      if (universe) dueQuery = dueQuery.eq("universe", universe);
      if (category) dueQuery = dueQuery.eq("category_slug", category);
      const { data } = await dueQuery.limit(count);
      due = data || [];
    }
    const remaining = Math.max(0, count - due.length);
    let fresh: any[] = [];
    if (remaining) {
      let freshQuery = content.from("knowledge_objects").select(SESSION_FIELDS).eq("status", "published");
      if (universe) freshQuery = freshQuery.eq("universe", universe);
      if (category) freshQuery = freshQuery.eq("category_slug", category);
      if (exclude.length && exclude.length <= 200) freshQuery = freshQuery.not("id", "in", `(${exclude.join(",")})`);
      const { data } = await freshQuery.order("quality_score", { ascending: false, nullsFirst: false }).limit(Math.max(remaining * 3, remaining));
      fresh = (data || []).sort(() => Math.random() - 0.5).slice(0, remaining);
    }
    return NextResponse.json({ ok: true, serverTime: new Date().toISOString(), objects: [...due, ...fresh] });
  }

  if (action === "saved") {
    const kind = requestUrl.searchParams.get("kind") || "bookmarks";
    let query = db.from("knowledge_progress").select("object_id,status,bookmark,review_later,last_result,last_seen_at,user_response,response_saved,solved_at").eq("user_id", user.id);
    if (kind === "bookmarks") query = query.eq("bookmark", true);
    else if (kind === "review") query = query.eq("review_later", true);
    else if (kind === "mastered") query = query.eq("status", "mastered");
    else if (kind === "responses") query = query.eq("response_saved", true).order("solved_at", { ascending: false }).limit(100);
    else if (kind === "recent") query = query.not("last_seen_at", "is", null).order("last_seen_at", { ascending: false }).limit(50);
    else query = query.eq("last_result", "Again");
    const { data } = await query;
    const map = await objectMap(content, (data || []).map((x) => x.object_id));
    return NextResponse.json({ ok: true, objects: (data || []).map((x) => ({ ...map.get(x.object_id), progress: x })).filter((x) => x.id) });
  }

  if (action === "analytics") {
    const [{ data: progress }, { data: sessions }] = await Promise.all([
      db.from("knowledge_progress").select("object_id,status,attempt_count,correct_count,incorrect_count,mastery_score,last_seen_at,next_review_at,response_saved,solved_at").eq("user_id", user.id),
      db.from("knowledge_sessions").select("mode,status,last_activity_at,duration_seconds,result,score,correct_count,incorrect_count").eq("user_id", user.id).order("last_activity_at", { ascending: false }).limit(500)
    ]);
    const rows = progress || [];
    const map = await objectMap(content, rows.map((x) => x.object_id));
    const attempts = rows.reduce((n, x) => n + Number(x.attempt_count || 0), 0);
    const correct = rows.reduce((n, x) => n + Number(x.correct_count || 0), 0);
    const byUniverse = new Map<string, any>();
    const byCategory = new Map<string, any>();
    for (const row of rows) {
      const obj = map.get(row.object_id);
      if (!obj) continue;
      for (const [key, store] of [[obj.universe, byUniverse], [obj.category, byCategory]] as const) {
        const x = store.get(key) || { name: key, reviewed: 0, mastered: 0, attempts: 0, correct: 0 };
        if (row.status !== "unseen") x.reviewed += 1;
        if (row.status === "mastered") x.mastered += 1;
        x.attempts += Number(row.attempt_count || 0);
        x.correct += Number(row.correct_count || 0);
        store.set(key, x);
      }
    }
    const finalize = (m: Map<string, any>) => Array.from(m.values()).map((x) => ({ ...x, accuracy: x.attempts ? Math.round((x.correct / x.attempts) * 100) : 0 })).sort((a, b) => b.reviewed - a.reviewed);
    const meaningfulDays = new Set((sessions || []).filter((s) => s.last_activity_at).map((s) => new Date(s.last_activity_at).toDateString()));
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i += 1) {
      if (!meaningfulDays.has(cursor.toDateString())) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return NextResponse.json({ ok: true, serverTime: new Date().toISOString(), analytics: {
      reviewed: rows.filter((x) => x.status !== "unseen").length,
      mastered: rows.filter((x) => x.status === "mastered").length,
      recallAccuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
      reviewDue: rows.filter((x) => x.next_review_at && new Date(x.next_review_at) <= new Date()).length,
      savedResponses: rows.filter((x) => x.response_saved).length,
      streak,
      byUniverse: finalize(byUniverse), byCategory: finalize(byCategory), sessions: sessions || []
    } });
  }

  return NextResponse.json({ ok: false, error: "Unknown Knowledge Vault action." }, { status: 400 });
}

export async function POST(request: Request) {
  const { db, user } = await authContext();
  if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const clientKey = cleanKey(String(body.clientKey || ""));
  if (!clientKey) return NextResponse.json({ ok: false, error: "A valid clientKey is required." }, { status: 400 });
  try { await claimLegacyKey(db, clientKey); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not claim legacy progress." }, { status: 409 }); }

  if (action === "resetAll") {
    const [p, s, g] = await Promise.all([
      db.from("knowledge_progress").delete({ count: "exact" }).eq("user_id", user.id),
      db.from("knowledge_sessions").delete({ count: "exact" }).eq("user_id", user.id),
      db.from("knowledge_goals").delete({ count: "exact" }).eq("user_id", user.id)
    ]);
    const error = p.error || s.error || g.error;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, resetAt: new Date().toISOString(), deleted: { progress: p.count || 0, sessions: s.count || 0, goals: g.count || 0 } });
  }

  if (["rate", "seen", "bookmark", "reviewLater", "saveResponse"].includes(action)) {
    const objectId = String(body.objectId || "");
    if (!objectId) return NextResponse.json({ ok: false, error: "objectId is required." }, { status: 400 });
    const { data: current } = await db.from("knowledge_progress").select("*").eq("user_id", user.id).eq("object_id", objectId).maybeSingle();
    const now = new Date().toISOString();
    const next: any = current || { user_id: user.id, client_key: clientKey, object_id: objectId, status: "unseen", attempt_count: 0, correct_count: 0, incorrect_count: 0, mastery_score: 0, bookmark: false, review_later: false, response_saved: false, first_seen_at: now };
    next.user_id = user.id;
    next.client_key = next.client_key || clientKey;
    next.last_seen_at = now;
    next.updated_at = now;
    if (!next.first_seen_at) next.first_seen_at = now;
    if (action === "seen" && next.status === "unseen") next.status = "seen";
    if (action === "bookmark") next.bookmark = Boolean(body.value);
    if (action === "reviewLater") next.review_later = Boolean(body.value);
    if (action === "saveResponse") {
      const response = String(body.response || "").trim().slice(0, 12000);
      if (!response) return NextResponse.json({ ok: false, error: "Write a response before saving it." }, { status: 400 });
      next.user_response = response; next.response_saved = true; next.solved_at = now;
      if (next.status === "unseen" || next.status === "seen") next.status = "learning";
    }
    if (action === "rate") {
      const rating = String(body.rating || "Got It");
      const response = String(body.response || "").trim().slice(0, 12000);
      next.attempt_count = Number(next.attempt_count || 0) + 1;
      next.last_result = rating; next.solved_at = now;
      if (response) { next.user_response = response; next.response_saved = true; }
      if (rating === "Again") { next.incorrect_count = Number(next.incorrect_count || 0) + 1; next.status = "review"; next.mastery_score = Math.max(0, Number(next.mastery_score || 0) - 10); next.next_review_at = isoAfter(1); next.confidence = 1; }
      else if (rating === "Hard") { next.incorrect_count = Number(next.incorrect_count || 0) + 1; next.status = "review"; next.mastery_score = Math.min(95, Number(next.mastery_score || 0) + 5); next.next_review_at = isoAfter(2); next.confidence = 2; }
      else if (rating === "Mastered") { next.correct_count = Number(next.correct_count || 0) + 1; next.status = "mastered"; next.mastery_score = 100; next.next_review_at = isoAfter(30); next.confidence = 4; }
      else { next.correct_count = Number(next.correct_count || 0) + 1; next.status = "learning"; next.mastery_score = Math.min(99, Number(next.mastery_score || 0) + 15); next.next_review_at = isoAfter(7); next.confidence = 3; }
    }
    let saved: any = null;
    if (current?.id) {
      const { data, error } = await db.from("knowledge_progress").update(next).eq("id", current.id).eq("user_id", user.id).select().single();
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); saved = data;
    } else {
      delete next.id;
      const { data, error } = await db.from("knowledge_progress").insert(next).select().single();
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); saved = data;
    }
    return NextResponse.json({ ok: true, progress: saved, serverTime: now });
  }

  if (action === "startSession") {
    const { data, error } = await db.from("knowledge_sessions").insert({ user_id: user.id, client_key: clientKey, mode: String(body.mode || "quick_scan"), universe: body.universe || null, category: body.category || null, object_ids: Array.isArray(body.objectIds) ? body.objectIds : [], settings: body.settings || {} }).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, session: data });
  }

  if (action === "updateSession") {
    const sessionId = String(body.sessionId || "");
    const patch: any = { last_activity_at: new Date().toISOString() };
    for (const key of ["current_index", "correct_count", "incorrect_count", "score", "duration_seconds", "status", "result"]) if (body[key] !== undefined) patch[key] = body[key];
    if (patch.status === "completed") patch.completed_at = new Date().toISOString();
    const { data, error } = await db.from("knowledge_sessions").update(patch).eq("id", sessionId).eq("user_id", user.id).select().maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, session: data });
  }

  if (action === "goal") {
    await db.from("knowledge_goals").update({ active: false, updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("active", true);
    const { data, error } = await db.from("knowledge_goals").insert({ user_id: user.id, client_key: clientKey, goal_type: String(body.goalType || "objects"), target: Number(body.target || 50), period: String(body.period || "week"), active: true }).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, goal: data });
  }

  return NextResponse.json({ ok: false, error: "Unknown Knowledge Vault write action." }, { status: 400 });
}
