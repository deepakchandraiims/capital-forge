import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth/server";
import { createServerSupabase } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

type AttemptInput = {
  id?: string;
  correct?: boolean | null;
  at?: string;
  response?: string;
  savedResponse?: boolean;
  durationSeconds?: number;
  title?: string;
  category?: string;
  questionType?: string;
  score?: number;
};

function safeText(value: unknown, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function safeDate(value: unknown) {
  const d = new Date(String(value || ""));
  return Number.isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString();
}

async function currentUser() {
  const [supabase, auth] = await Promise.all([createServerSupabase(), getAuthContext()]);
  if (!auth.user) return { supabase, user: null as { id: string } | null };
  return { supabase, user: { id: auth.user.id } };
}

function mapAttempt(row: any) {
  const graded = row.metadata?.graded !== false;
  return {
    id: row.question_id,
    correct: graded ? Boolean(row.is_correct) : null,
    at: row.created_at,
    response: row.answer ?? undefined,
    savedResponse: Boolean(row.response_saved),
    durationSeconds: row.time_taken_seconds ?? undefined,
    title: row.title ?? undefined,
    category: row.category ?? undefined,
    questionType: row.question_type ?? undefined,
    score: row.score ?? undefined
  };
}

async function saveAttempt(supabase: any, userId: string, input: AttemptInput) {
  const questionId = safeText(input.id, 220);
  if (!questionId) throw new Error("Question id is required.");
  const correct = typeof input.correct === "boolean" ? input.correct : null;
  const row = {
    user_id: userId,
    question_id: questionId,
    category: safeText(input.category || "Practice", 220) || "Practice",
    concept: safeText(input.title || input.category || input.questionType || "Practice", 500) || "Practice",
    answer: input.response == null ? null : safeText(input.response, 50000),
    score: Number.isFinite(Number(input.score)) ? Math.max(0, Math.min(100, Number(input.score))) : correct === true ? 100 : 0,
    is_correct: correct === true,
    confidence: 0,
    time_taken_seconds: Number.isFinite(Number(input.durationSeconds)) ? Math.max(0, Math.round(Number(input.durationSeconds))) : null,
    created_at: safeDate(input.at),
    title: input.title ? safeText(input.title, 2000) : null,
    question_type: input.questionType ? safeText(input.questionType, 220) : null,
    response_saved: Boolean(input.savedResponse),
    metadata: { graded: correct !== null }
  };

  const { data: existing } = await supabase
    .from("capital_forge_attempts")
    .select("id")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("capital_forge_attempts").update(row).eq("id", existing.id).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("capital_forge_attempts").insert(row);
    if (error) throw error;
  }
}

export async function GET() {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });

  const [{ data: attempts, error: attemptError }, { data: bookmarks, error: bookmarkError }, { data: state, error: stateError }] = await Promise.all([
    supabase.from("capital_forge_attempts").select("question_id,category,answer,score,is_correct,time_taken_seconds,created_at,title,question_type,response_saved,metadata").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5000),
    supabase.from("capital_forge_bookmarks").select("question_id,collection,created_at").eq("user_id", user.id),
    supabase.from("capital_forge_user_state").select("state,updated_at").eq("user_id", user.id).maybeSingle()
  ]);
  const error = attemptError || bookmarkError || stateError;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    attempts: (attempts || []).map(mapAttempt),
    bookmarks: (bookmarks || []).filter((x: any) => x.collection === "Review Later").map((x: any) => x.question_id),
    state: state?.state || {},
    serverTime: new Date().toISOString()
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");

  try {
    if (action === "saveAttempt") {
      await saveAttempt(supabase, user.id, body.attempt || {});
      return NextResponse.json({ ok: true });
    }

    if (action === "bookmark") {
      const questionId = safeText(body.questionId, 220);
      if (!questionId) return NextResponse.json({ ok: false, error: "questionId is required." }, { status: 400 });
      if (Boolean(body.value)) {
        const { error } = await supabase.from("capital_forge_bookmarks").upsert({ user_id: user.id, question_id: questionId, collection: "Review Later" }, { onConflict: "user_id,question_id,collection" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("capital_forge_bookmarks").delete().eq("user_id", user.id).eq("question_id", questionId).eq("collection", "Review Later");
        if (error) throw error;
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "state") {
      const patch = body.patch && typeof body.patch === "object" && !Array.isArray(body.patch) ? body.patch : {};
      const { data: existing } = await supabase.from("capital_forge_user_state").select("state").eq("user_id", user.id).maybeSingle();
      const next = { ...(existing?.state || {}), ...patch };
      const { error } = await supabase.from("capital_forge_user_state").upsert({ user_id: user.id, state: next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      return NextResponse.json({ ok: true, state: next });
    }

    if (action === "importLegacy") {
      const legacyAttempts = Array.isArray(body.attempts) ? body.attempts.slice(0, 5000) : [];
      for (const attempt of legacyAttempts) await saveAttempt(supabase, user.id, attempt || {});
      const legacyBookmarks = Array.isArray(body.bookmarks) ? body.bookmarks.slice(0, 5000).map((x: unknown) => safeText(x, 220)).filter(Boolean) : [];
      if (legacyBookmarks.length) {
        const rows = legacyBookmarks.map((questionId: string) => ({ user_id: user.id, question_id: questionId, collection: "Review Later" }));
        const { error } = await supabase.from("capital_forge_bookmarks").upsert(rows, { onConflict: "user_id,question_id,collection" });
        if (error) throw error;
      }
      const legacyState = body.state && typeof body.state === "object" && !Array.isArray(body.state) ? body.state : {};
      const { data: existing } = await supabase.from("capital_forge_user_state").select("state").eq("user_id", user.id).maybeSingle();
      const next = {
        ...(existing?.state || {}),
        ...legacyState,
        cf003LegacyImportedAt: new Date().toISOString()
      };
      const { error } = await supabase.from("capital_forge_user_state").upsert({ user_id: user.id, state: next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      return NextResponse.json({ ok: true, importedAttempts: legacyAttempts.length, importedBookmarks: legacyBookmarks.length });
    }

    return NextResponse.json({ ok: false, error: "Unknown user-progress action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not save progress." }, { status: 500 });
  }
}
