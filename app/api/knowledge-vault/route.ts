import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const UNIVERSES = [
  { name: "Technicals", slug: "technicals", categories: 10 },
  { name: "Market History", slug: "market-history", categories: 4 },
  { name: "Legendary Trades & Deals", slug: "legendary-trades-deals", categories: 5 },
  { name: "Crises & Events", slug: "crises-events", categories: 4 },
  { name: "Finance Facts", slug: "finance-facts", categories: 2 }
] as const;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
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

async function objectMap(client: ReturnType<typeof createClient>, ids: string[]) {
  if (!ids.length) return new Map<string, any>();
  const { data } = await client.from("knowledge_objects").select("id,source_record_key,title,universe,category,category_slug,topic,difficulty,content_type,question_type,estimated_time_seconds,source_kind,quality_score,event_date,status").in("id", ids).eq("status", "published");
  return new Map((data || []).map((row: any) => [row.id, row]));
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const action = requestUrl.searchParams.get("action") || "landing";
  const clientKey = cleanKey(requestUrl.searchParams.get("clientKey"));
  const admin = adminClient();
  const client = admin || publicClient();
  if (!client) return NextResponse.json({ ok: false, error: "Supabase is not configured for Knowledge Vault." }, { status: 503 });

  if (action === "landing") {
    const [{ count: databaseObjects }, { data: featured }] = await Promise.all([
      client.from("knowledge_objects").select("id", { count: "exact", head: true }).eq("status", "published"),
      client.from("knowledge_objects").select("id,source_record_key,title,universe,category,category_slug,topic,difficulty,content_type,question_type,estimated_time_seconds,source_kind,quality_score,event_date").eq("status", "published").order("quality_score", { ascending: false, nullsFirst: false }).limit(8)
    ]);

    let progress: any[] = [];
    let sessions: any[] = [];
    let goal: any = null;
    if (admin && clientKey) {
      const [{ data: p }, { data: s }, { data: g }] = await Promise.all([
        admin.from("knowledge_progress").select("object_id,status,attempt_count,correct_count,incorrect_count,mastery_score,bookmark,review_later,last_seen_at,next_review_at").eq("client_key", clientKey),
        admin.from("knowledge_sessions").select("id,mode,status,object_ids,current_index,last_activity_at").eq("client_key", clientKey).order("last_activity_at", { ascending: false }).limit(10),
        admin.from("knowledge_goals").select("id,goal_type,target,period,active").eq("client_key", clientKey).eq("active", true).maybeSingle()
      ]);
      progress = p || [];
      sessions = s || [];
      goal = g || null;
    }

    const reviewed = progress.filter((x) => x.status && x.status !== "unseen").length;
    const mastered = progress.filter((x) => x.status === "mastered").length;
    const learningReview = progress.filter((x) => x.status === "learning" || x.status === "review").length;
    const attempts = progress.reduce((n, x) => n + Number(x.attempt_count || 0), 0);
    const correct = progress.reduce((n, x) => n + Number(x.correct_count || 0), 0);
    const due = progress.filter((x) => x.next_review_at && new Date(x.next_review_at) <= new Date()).length;
    const recentProgress = [...progress].filter((x) => x.last_seen_at).sort((a, b) => String(b.last_seen_at).localeCompare(String(a.last_seen_at))).slice(0, 5);
    const recentMap = await objectMap(client, recentProgress.map((x) => x.object_id));
    const recent = recentProgress.map((x) => ({ ...recentMap.get(x.object_id), progress: x })).filter((x) => x.id);
    const activeSession = sessions.find((x) => x.status === "active") || null;

    return NextResponse.json({
      ok: true,
      dataset: { expected: 3000, categories: 25, sourceGrounded: 1800, authored: 1200, unique: 2400, variants: 600, databaseObjects: databaseObjects || 0, readyForImport: (databaseObjects || 0) !== 3000 },
      universes: UNIVERSES,
      featured: featured || [],
      progress: { reviewed, mastered, learningReview, unseen: Math.max(0, 3000 - reviewed), recallAccuracy: attempts ? Math.round((correct / attempts) * 100) : 0, reviewDue: due },
      recent,
      activeSession,
      goal
    });
  }

  if (action === "categories") {
    const universe = cleanTerm(requestUrl.searchParams.get("universe"));
    let query = client.from("knowledge_objects").select("category,category_slug,universe").eq("status", "published").limit(4000);
    if (universe) query = query.eq("universe", universe);
    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const map = new Map<string, { name: string; slug: string; universe: string; count: number }>();
    for (const row of data || []) {
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
    let query = client.from("knowledge_objects").select("*").eq("status", "published");
    query = id ? query.eq("id", id) : query.eq("source_record_key", key || "__missing__");
    const { data: object, error } = await query.maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!object) return NextResponse.json({ ok: false, error: "Knowledge object not found." }, { status: 404 });
    let sources: any[] = [];
    if (Array.isArray(object.source_ids) && object.source_ids.length) {
      const { data } = await client.from("cf_sources").select("id,publisher,title,url,source_type,document_date,authority_tier,notes").in("id", object.source_ids);
      sources = data || [];
    }
    return NextResponse.json({ ok: true, object, sources });
  }

  if (action === "list" || action === "timeline") {
    const universe = cleanTerm(requestUrl.searchParams.get("universe"));
    const category = cleanTerm(requestUrl.searchParams.get("category"));
    const contentType = cleanTerm(requestUrl.searchParams.get("contentType"));
    const q = cleanTerm(requestUrl.searchParams.get("q"));
    const limit = Math.min(50, Math.max(1, Number(requestUrl.searchParams.get("limit") || 24)));
    let query = client.from("knowledge_objects").select("id,source_record_key,title,universe,category,category_slug,topic,subtopic,difficulty,content_type,question_type,estimated_time_seconds,source_kind,quality_score,event_date,tags").eq("status", "published");
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
    let exclude: string[] = [];
    let dueIds: string[] = [];
    if (admin && clientKey) {
      const { data: p } = await admin.from("knowledge_progress").select("object_id,status,next_review_at").eq("client_key", clientKey);
      const rows = p || [];
      if (onlyUnseen) exclude = rows.map((x) => x.object_id);
      dueIds = rows.filter((x) => x.next_review_at && new Date(x.next_review_at) <= new Date()).map((x) => x.object_id);
    }
    let due: any[] = [];
    if (dueIds.length) {
      let dueQuery = client.from("knowledge_objects").select("*").eq("status", "published").in("id", dueIds.slice(0, 200));
      if (universe) dueQuery = dueQuery.eq("universe", universe);
      if (category) dueQuery = dueQuery.eq("category_slug", category);
      const { data } = await dueQuery.limit(count);
      due = data || [];
    }
    const remaining = Math.max(0, count - due.length);
    let fresh: any[] = [];
    if (remaining) {
      let freshQuery = client.from("knowledge_objects").select("*").eq("status", "published");
      if (universe) freshQuery = freshQuery.eq("universe", universe);
      if (category) freshQuery = freshQuery.eq("category_slug", category);
      if (exclude.length && exclude.length <= 200) freshQuery = freshQuery.not("id", "in", `(${exclude.join(",")})`);
      const { data } = await freshQuery.order("quality_score", { ascending: false, nullsFirst: false }).limit(Math.max(remaining * 3, remaining));
      fresh = (data || []).sort(() => Math.random() - 0.5).slice(0, remaining);
    }
    return NextResponse.json({ ok: true, objects: [...due, ...fresh] });
  }

  if (action === "saved") {
    if (!admin || !clientKey) return NextResponse.json({ ok: true, objects: [] });
    const kind = requestUrl.searchParams.get("kind") || "bookmarks";
    let query = admin.from("knowledge_progress").select("object_id,status,bookmark,review_later,last_seen_at").eq("client_key", clientKey);
    if (kind === "bookmarks") query = query.eq("bookmark", true);
    else if (kind === "review") query = query.eq("review_later", true);
    else if (kind === "mastered") query = query.eq("status", "mastered");
    else if (kind === "recent") query = query.not("last_seen_at", "is", null).order("last_seen_at", { ascending: false }).limit(50);
    else query = query.eq("last_result", "Again");
    const { data } = await query;
    const map = await objectMap(client, (data || []).map((x) => x.object_id));
    return NextResponse.json({ ok: true, objects: (data || []).map((x) => ({ ...map.get(x.object_id), progress: x })).filter((x) => x.id) });
  }

  if (action === "analytics") {
    if (!admin || !clientKey) return NextResponse.json({ ok: true, analytics: { reviewed: 0, mastered: 0, recallAccuracy: 0, reviewDue: 0, streak: 0, byUniverse: [], byCategory: [] } });
    const [{ data: progress }, { data: sessions }] = await Promise.all([
      admin.from("knowledge_progress").select("object_id,status,attempt_count,correct_count,incorrect_count,mastery_score,last_seen_at,next_review_at").eq("client_key", clientKey),
      admin.from("knowledge_sessions").select("mode,status,last_activity_at,duration_seconds,result").eq("client_key", clientKey).order("last_activity_at", { ascending: false }).limit(500)
    ]);
    const rows = progress || [];
    const map = await objectMap(client, rows.map((x) => x.object_id));
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
        x.attempts += Number(row.attempt_count || 0); x.correct += Number(row.correct_count || 0); store.set(key, x);
      }
    }
    const finalize = (m: Map<string, any>) => Array.from(m.values()).map((x) => ({ ...x, accuracy: x.attempts ? Math.round((x.correct / x.attempts) * 100) : 0 })).sort((a, b) => b.reviewed - a.reviewed);
    const meaningfulDays = new Set((sessions || []).filter((s) => s.last_activity_at).map((s) => new Date(s.last_activity_at).toDateString()));
    let streak = 0; const cursor = new Date();
    for (let i = 0; i < 365; i += 1) { if (!meaningfulDays.has(cursor.toDateString())) break; streak += 1; cursor.setDate(cursor.getDate() - 1); }
    return NextResponse.json({ ok: true, analytics: { reviewed: rows.filter((x) => x.status !== "unseen").length, mastered: rows.filter((x) => x.status === "mastered").length, recallAccuracy: attempts ? Math.round((correct / attempts) * 100) : 0, reviewDue: rows.filter((x) => x.next_review_at && new Date(x.next_review_at) <= new Date()).length, streak, byUniverse: finalize(byUniverse), byCategory: finalize(byCategory), sessions: sessions || [] } });
  }

  return NextResponse.json({ ok: false, error: "Unknown Knowledge Vault action." }, { status: 400 });
}

export async function POST(request: Request) {
  const admin = adminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is required for Knowledge Vault progress writes." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const clientKey = cleanKey(String(body.clientKey || ""));
  if (!clientKey) return NextResponse.json({ ok: false, error: "A valid clientKey is required." }, { status: 400 });

  if (["rate", "seen", "bookmark", "reviewLater"].includes(action)) {
    const objectId = String(body.objectId || "");
    if (!objectId) return NextResponse.json({ ok: false, error: "objectId is required." }, { status: 400 });
    const { data: current } = await admin.from("knowledge_progress").select("*").eq("client_key", clientKey).eq("object_id", objectId).maybeSingle();
    const now = new Date().toISOString();
    const next: any = current || { client_key: clientKey, object_id: objectId, status: "unseen", attempt_count: 0, correct_count: 0, incorrect_count: 0, mastery_score: 0, bookmark: false, review_later: false, first_seen_at: now };
    next.last_seen_at = now; next.updated_at = now;
    if (action === "seen" && next.status === "unseen") next.status = "seen";
    if (action === "bookmark") next.bookmark = Boolean(body.value);
    if (action === "reviewLater") next.review_later = Boolean(body.value);
    if (action === "rate") {
      const rating = String(body.rating || "Got It");
      next.attempt_count = Number(next.attempt_count || 0) + 1;
      next.last_result = rating;
      if (rating === "Again") { next.incorrect_count = Number(next.incorrect_count || 0) + 1; next.status = "review"; next.mastery_score = Math.max(0, Number(next.mastery_score || 0) - 10); next.next_review_at = isoAfter(1); next.confidence = 1; }
      else if (rating === "Hard") { next.incorrect_count = Number(next.incorrect_count || 0) + 1; next.status = "review"; next.mastery_score = Math.min(95, Number(next.mastery_score || 0) + 5); next.next_review_at = isoAfter(2); next.confidence = 2; }
      else if (rating === "Mastered") { next.correct_count = Number(next.correct_count || 0) + 1; next.status = "mastered"; next.mastery_score = 100; next.next_review_at = isoAfter(30); next.confidence = 4; }
      else { next.correct_count = Number(next.correct_count || 0) + 1; next.status = "learning"; next.mastery_score = Math.min(99, Number(next.mastery_score || 0) + 15); next.next_review_at = isoAfter(7); next.confidence = 3; }
    }
    const { data, error } = await admin.from("knowledge_progress").upsert(next, { onConflict: "client_key,object_id" }).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, progress: data });
  }

  if (action === "startSession") {
    const { data, error } = await admin.from("knowledge_sessions").insert({ client_key: clientKey, mode: String(body.mode || "quick_scan"), universe: body.universe || null, category: body.category || null, object_ids: Array.isArray(body.objectIds) ? body.objectIds : [], settings: body.settings || {} }).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, session: data });
  }

  if (action === "updateSession") {
    const sessionId = String(body.sessionId || "");
    const patch: any = { last_activity_at: new Date().toISOString() };
    for (const key of ["current_index", "correct_count", "incorrect_count", "score", "duration_seconds", "status", "result"]) if (body[key] !== undefined) patch[key] = body[key];
    if (patch.status === "completed") patch.completed_at = new Date().toISOString();
    const { data, error } = await admin.from("knowledge_sessions").update(patch).eq("id", sessionId).eq("client_key", clientKey).select().maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, session: data });
  }

  if (action === "goal") {
    await admin.from("knowledge_goals").update({ active: false, updated_at: new Date().toISOString() }).eq("client_key", clientKey).eq("active", true);
    const { data, error } = await admin.from("knowledge_goals").insert({ client_key: clientKey, goal_type: String(body.goalType || "objects"), target: Number(body.target || 50), period: String(body.period || "week"), active: true }).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, goal: data });
  }

  return NextResponse.json({ ok: false, error: "Unknown Knowledge Vault write action." }, { status: 400 });
}
