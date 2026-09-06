import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function intParam(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function GET(request: Request) {
  const db = admin();
  if (!db) return NextResponse.json({ ok: false, error: "Quick Math database is not configured." }, { status: 503 });

  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "meta";

  if (action === "meta") {
    const { data, error } = await db.rpc("get_quick_math_meta");
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, dataset: data }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" }
    });
  }

  if (action === "round") {
    const rawLevel = intParam(url.searchParams.get("level"), 0);
    const rawDifficulty = intParam(url.searchParams.get("difficulty"), 0);
    const count = Math.min(100, Math.max(1, intParam(url.searchParams.get("count"), 25)));
    const level = rawLevel >= 1 && rawLevel <= 44 ? rawLevel : null;
    const difficulty = rawDifficulty >= 1 && rawDifficulty <= 10 ? rawDifficulty : null;

    const { data, error } = await db.rpc("get_quick_math_round", {
      p_level: level,
      p_difficulty: difficulty,
      p_count: count
    });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const questions = (data || []).map((q: any) => ({
      id: q.id,
      level: q.level,
      level_name: q.level_name,
      category: q.category,
      subcategory: q.subcategory,
      difficulty: q.difficulty,
      difficulty_label: q.difficulty_label,
      question_type: q.question_type,
      question: q.question,
      answer: q.answer,
      acceptable_answers: q.acceptable_answers,
      tolerance: Number(q.tolerance || 0),
      unit: q.unit || "",
      time_target_seconds: q.time_target_seconds,
      xp: q.xp,
      concept: q.concept,
      technique: q.technique,
      solution: q.solution,
      tags: q.tags || [],
      validation_status: q.validation_status
    }));

    return NextResponse.json({ ok: true, questions });
  }

  if (action === "question") {
    const id = String(url.searchParams.get("id") || "").trim();
    if (!/^QM-\d{6}$/.test(id)) return NextResponse.json({ ok: false, error: "Invalid question id." }, { status: 400 });
    const { data, error } = await db.from("quick_math_questions").select("*").eq("id", id).maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: "Question not found." }, { status: 404 });
    return NextResponse.json({ ok: true, question: data });
  }

  return NextResponse.json({ ok: false, error: "Unknown Quick Math action." }, { status: 400 });
}
