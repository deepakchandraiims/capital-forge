import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN_SHA256 = "4d7054695a26bdcfebe447d506f0d600af23abeffe516e5f7d52d49493b5b436";
const BATCH_ID = "91b16582-a135-42e8-a11b-374ac6268e17";

function tokenMatches(value: string | null) {
  const supplied = (value || "").trim();
  if (!supplied) return false;
  const actual = createHash("sha256").update(supplied).digest();
  const expected = Buffer.from(TOKEN_SHA256, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function asArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function normalizeSeniority(value: unknown) {
  const v = String(value || "").trim().toLowerCase();
  const map: Record<string,string> = {
    foundation: "Foundation",
    easy: "Easy",
    intermediate: "Intermediate",
    hard: "Hard",
    advanced: "Advanced",
    analyst: "Analyst",
    associate: "Associate",
    vp: "VP",
    director: "Director",
    "md/partner/ic": "MD/Partner/IC",
    "md / partner / ic": "MD/Partner/IC",
  };
  return map[v] || String(value || "Analyst");
}

export async function POST(request: NextRequest) {
  if (!tokenMatches(request.headers.get("x-capital-forge-remediate"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Supabase server configuration incomplete" }, { status: 503 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: rows, error } = await supabase
    .from("cf_content_staging")
    .select("id,source_record_key,content_type,validation_status,validation_errors,validation_warnings,raw_content")
    .eq("import_batch_id", BATCH_ID)
    .eq("validation_status", "needs_review")
    .order("source_record_key");

  if (error) return NextResponse.json({ ok: false, stage: "read", error: error.message }, { status: 500 });

  const changed: Array<{key:string; fixes:string[]}> = [];

  for (const row of rows || []) {
    const raw: any = { ...(row.raw_content || {}) };
    const fixes: string[] = [];

    if (row.content_type === "question" || row.content_type === "interview_question") {
      raw.contract_version = raw.contract_version || "1.0";
      raw.content_type = raw.content_type || row.content_type;
      raw.question = String(raw.question || "").trim();
      raw.model_answer = String(raw.model_answer || raw.correct_answer || "").trim();
      raw.correct_answer = raw.correct_answer ?? null;
      raw.expected_time_seconds = Number.isFinite(Number(raw.expected_time_seconds)) ? Number(raw.expected_time_seconds) : 120;
      raw.expected_points = asArray(raw.expected_points, raw.correct_answer ? [String(raw.correct_answer)] : []);
      raw.common_wrong_answers = asArray(raw.common_wrong_answers, []);
      raw.follow_ups = asArray(raw.follow_ups, []);
      raw.career_tracks = asArray(raw.career_tracks, []);
      raw.sources = asArray(raw.sources, []);
      raw.seniority = normalizeSeniority(raw.seniority);
      if (!raw.rubric || typeof raw.rubric !== "object" || Array.isArray(raw.rubric)) {
        raw.rubric = { total_points: 10, criteria: [{ criterion: "Correct answer and reasoning", points: 10 }] };
        fixes.push("rubric_created");
      }

      if (raw.question_type === "mcq" && (!Array.isArray(raw.options) || raw.options.length < 2)) {
        const answer = String(raw.correct_answer || "").trim().toLowerCase();
        const prompt = String(raw.question || "").toLowerCase();
        if (answer === "true" || answer === "false" || /true\s*(?:\/|or)\s*false/.test(prompt)) {
          raw.options = ["True", "False"];
          fixes.push("true_false_options_added");
        }
      }

      if (raw.question_type === "mcq" && Array.isArray(raw.options) && raw.options.length >= 2 && !raw.correct_answer) {
        fixes.push("mcq_missing_correct_answer_unresolved");
      }

      if (raw.calculation_required === undefined) raw.calculation_required = false;
    }

    if (fixes.length > 0) {
      const { error: updateError } = await supabase
        .from("cf_content_staging")
        .update({ raw_content: raw })
        .eq("id", row.id);
      if (updateError) {
        return NextResponse.json({ ok: false, stage: "update", key: row.source_record_key, error: updateError.message }, { status: 500 });
      }
      changed.push({ key: row.source_record_key, fixes });
    }
  }

  let validationCalled = false;
  let validationMessage = "Not attempted";
  for (const params of [{ p_batch_id: BATCH_ID }, { p_import_batch_id: BATCH_ID }, { batch_id: BATCH_ID }]) {
    const { error: rpcError } = await supabase.rpc("cf_validate_import_batch", params);
    if (!rpcError) {
      validationCalled = true;
      validationMessage = `Validated using ${Object.keys(params)[0]}`;
      break;
    }
    validationMessage = String(rpcError.message || "");
    if (!/function .* does not exist|Could not find the function|schema cache|parameter/i.test(validationMessage)) break;
  }

  const { data: afterRows, error: afterError } = await supabase
    .from("cf_content_staging")
    .select("source_record_key,content_type,validation_status,validation_errors,validation_warnings,raw_content")
    .eq("import_batch_id", BATCH_ID)
    .order("source_record_key");
  if (afterError) return NextResponse.json({ ok: false, stage: "summary", error: afterError.message }, { status: 500 });

  const statusSummary: Record<string, number> = {};
  const remaining: any[] = [];
  for (const r of afterRows || []) {
    const k = `${r.content_type} / ${r.validation_status}`;
    statusSummary[k] = (statusSummary[k] || 0) + 1;
    if (r.validation_status === "needs_review") {
      remaining.push({
        key: r.source_record_key,
        questionType: (r.raw_content as any)?.question_type || null,
        errors: r.validation_errors || [],
        warnings: r.validation_warnings || [],
        hasOptions: Array.isArray((r.raw_content as any)?.options) && (r.raw_content as any).options.length >= 2,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    batchId: BATCH_ID,
    beforeNeedsReview: rows?.length || 0,
    changedCount: changed.length,
    changed,
    validationCalled,
    validationMessage,
    statusSummary,
    remainingNeedsReview: remaining.length,
    remaining,
  });
}
