import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN_SHA256 = "4545ccd472083be97391414338d888865f36f9cbaefad5b2a688e631182fcc50";
const BATCH_ID = "91b16582-a135-42e8-a11b-374ac6268e17";

function tokenMatches(value: string | null) {
  const supplied = (value || "").trim();
  if (!supplied) return false;
  const actual = createHash("sha256").update(supplied).digest();
  const expected = Buffer.from(TOKEN_SHA256, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: NextRequest) {
  if (!tokenMatches(request.nextUrl.searchParams.get("token"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Supabase server configuration incomplete" }, { status: 503 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: reviewRows, error: reviewError } = await supabase
    .from("cf_content_staging")
    .select("source_record_key,content_type,validation_status,validation_errors,validation_warnings,deterministic_status,raw_content,detected_domain,detected_topic,proposed_difficulty")
    .eq("import_batch_id", BATCH_ID)
    .eq("validation_status", "needs_review")
    .order("source_record_key");

  if (reviewError) {
    return NextResponse.json({ ok: false, stage: "needs_review", error: reviewError.message }, { status: 500 });
  }

  const { data: calcRows, error: calcError } = await supabase
    .from("cf_content_staging")
    .select("source_record_key,content_type,validation_status,deterministic_status,raw_content")
    .eq("import_batch_id", BATCH_ID)
    .contains("raw_content", { calculation_required: true })
    .order("source_record_key");

  if (calcError) {
    return NextResponse.json({ ok: false, stage: "calculations", error: calcError.message }, { status: 500 });
  }

  const review = (reviewRows || []).map((r: any) => ({
    key: r.source_record_key,
    type: r.content_type,
    questionType: r.raw_content?.question_type || null,
    domain: r.detected_domain,
    topic: r.detected_topic,
    difficulty: r.proposed_difficulty,
    errors: r.validation_errors || [],
    warnings: r.validation_warnings || [],
    hasOptions: Array.isArray(r.raw_content?.options) && r.raw_content.options.length > 0,
    correctAnswer: r.raw_content?.correct_answer ?? null,
  }));

  const calc = (calcRows || []).map((r: any) => ({
    key: r.source_record_key,
    questionType: r.raw_content?.question_type || null,
    validationStatus: r.validation_status,
    deterministicStatus: r.deterministic_status,
    calculator: r.raw_content?.deterministic_validator?.calculator || null,
    hasValidator: Boolean(r.raw_content?.deterministic_validator && Object.keys(r.raw_content.deterministic_validator).length),
    correctAnswer: r.raw_content?.correct_answer ?? null,
  }));

  const errorCounts: Record<string, number> = {};
  const warningCounts: Record<string, number> = {};
  for (const r of review) {
    for (const e of Array.isArray(r.errors) ? r.errors : [r.errors]) {
      const k = String(e);
      errorCounts[k] = (errorCounts[k] || 0) + 1;
    }
    for (const w of Array.isArray(r.warnings) ? r.warnings : [r.warnings]) {
      const k = String(w);
      warningCounts[k] = (warningCounts[k] || 0) + 1;
    }
  }

  const calcStatusCounts: Record<string, number> = {};
  const calcTypeCounts: Record<string, number> = {};
  for (const r of calc) {
    calcStatusCounts[String(r.deterministicStatus)] = (calcStatusCounts[String(r.deterministicStatus)] || 0) + 1;
    calcTypeCounts[String(r.questionType)] = (calcTypeCounts[String(r.questionType)] || 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    batchId: BATCH_ID,
    needsReviewCount: review.length,
    calculationCount: calc.length,
    errorCounts,
    warningCounts,
    calcStatusCounts,
    calcTypeCounts,
    needsReview: review,
    calculations: calc,
  });
}
