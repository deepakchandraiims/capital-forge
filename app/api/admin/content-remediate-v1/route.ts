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

export async function POST(request: NextRequest) {
  if (!tokenMatches(request.headers.get("x-capital-forge-remediate"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Supabase server configuration incomplete" }, { status: 503 });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await supabase
    .from("cf_content_staging")
    .select("id,source_record_key,content_type,validation_status,validation_errors,validation_warnings,raw_content")
    .eq("import_batch_id", BATCH_ID)
    .eq("validation_status", "needs_review")
    .order("source_record_key");

  if (error) {
    return NextResponse.json({ ok: false, stage: "read", error: error.message }, { status: 500 });
  }

  const beforeNeedsReview = rows?.length || 0;
  const changed: Array<{ key: string; fixes: string[] }> = [];

  // Resolve the canonical Financial Modeling / Three-Statement Model taxonomy
  // instead of guessing the topic display name used by the validator.
  const { data: modelingDomain, error: domainError } = await supabase
    .from("cf_domains")
    .select("id,name,slug")
    .eq("slug", "financial-modeling")
    .maybeSingle();

  if (domainError || !modelingDomain) {
    return NextResponse.json(
      { ok: false, stage: "taxonomy_domain", error: domainError?.message || "financial-modeling domain not found" },
      { status: 500 }
    );
  }

  const { data: threeStatementTopic, error: topicError } = await supabase
    .from("cf_topics")
    .select("id,name,slug,domain_id")
    .eq("domain_id", modelingDomain.id)
    .eq("slug", "three-statement-model")
    .maybeSingle();

  if (topicError || !threeStatementTopic) {
    return NextResponse.json(
      { ok: false, stage: "taxonomy_topic", error: topicError?.message || "three-statement-model topic not found" },
      { status: 500 }
    );
  }

  for (const row of rows || []) {
    const raw: any = { ...(row.raw_content || {}) };
    const fixes: string[] = [];
    const updatePayload: Record<string, unknown> = {};
    const validationErrors = asArray<string>(row.validation_errors, []);

    // 28 Three-Statement Model questions were structurally sound but their imported
    // topic display name did not match the existing canonical topic name.
    if (
      row.source_record_key.startsWith("MOD-3SM-") &&
      validationErrors.some((e) => String(e).toLowerCase().includes("topic does not exist"))
    ) {
      raw.domain = modelingDomain.name;
      raw.topic = threeStatementTopic.name;
      updatePayload.detected_domain = modelingDomain.name;
      updatePayload.detected_topic = threeStatementTopic.name;
      fixes.push(`taxonomy_aligned:${modelingDomain.name}/${threeStatementTopic.name}`);
    }

    // The original Rule-of-72 answer was numerically correct but too terse for the
    // structural contract. Expand the explanation without changing the conclusion.
    if (row.source_record_key === "MM-CALC-0102") {
      raw.model_answer =
        "Using the Rule of 72, the approximate doubling time is 72 ÷ 6 = 12 years. So debt growing at 6% annually with no repayment roughly doubles in about 12 years.";
      raw.expected_points = [
        "Apply the Rule of 72: 72 ÷ 6 ≈ 12 years, so the debt roughly doubles in about 12 years.",
      ];
      raw.rubric = {
        total_points: 10,
        criteria: [
          { criterion: "Applies the Rule of 72 correctly", points: 5 },
          { criterion: "Concludes approximately 12 years", points: 5 },
        ],
      };
      fixes.push("model_answer_expanded_and_rubric_added");
    }

    // The controlled vocabulary uses the slug for the top seniority tier.
    if (row.source_record_key === "PE-IC-0031") {
      raw.seniority = "md-partner-ic";
      fixes.push("seniority_normalized_to_md-partner-ic");
    }

    if (fixes.length > 0) {
      updatePayload.raw_content = raw;
      const { error: updateError } = await supabase
        .from("cf_content_staging")
        .update(updatePayload)
        .eq("id", row.id);

      if (updateError) {
        return NextResponse.json(
          { ok: false, stage: "update", key: row.source_record_key, error: updateError.message },
          { status: 500 }
        );
      }
      changed.push({ key: row.source_record_key, fixes });
    }
  }

  let validationCalled = false;
  let validationMessage = "Not attempted";
  for (const params of [
    { p_batch_id: BATCH_ID },
    { p_import_batch_id: BATCH_ID },
    { batch_id: BATCH_ID },
  ]) {
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

  if (afterError) {
    return NextResponse.json({ ok: false, stage: "summary", error: afterError.message }, { status: 500 });
  }

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
        domain: (r.raw_content as any)?.domain || null,
        topic: (r.raw_content as any)?.topic || null,
        seniority: (r.raw_content as any)?.seniority || null,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    batchId: BATCH_ID,
    beforeNeedsReview,
    changedCount: changed.length,
    changed,
    canonicalThreeStatementTopic: threeStatementTopic.name,
    validationCalled,
    validationMessage,
    statusSummary,
    remainingNeedsReview: remaining.length,
    remaining,
    note:
      remaining.length === 0
        ? "All 605 objects now pass structural validation. Nothing has been published."
        : "Targeted remediation completed; unresolved records remain locked from publication.",
  });
}
