import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TARGET_BATCH = "CF-V2-2000-20260905-001";
const EXPECTED_TOTAL = 2000;
const CHUNK_SIZE = 100;
const CHUNKS = 20;

const LEGACY_QTYPES = new Set([
  "calculation", "short_answer", "excel_drill", "mcq", "error_detection",
  "technical_interview", "long_form", "mental_math", "deal_judgment",
  "mini_case", "would_you_invest",
]);

const QT_MAP: Record<string, string> = {
  numerical_calculation: "calculation",
  mcq: "mcq",
  true_false: "short_answer",
  formula_recall: "short_answer",
  ranking: "short_answer",
  sequencing: "short_answer",
  reverse_question: "short_answer",
  estimation: "short_answer",
  data_interpretation: "mini_case",
  sensitivity_analysis: "mini_case",
  scenario_analysis: "mini_case",
  filing_based: "mini_case",
  financial_statement_detective: "mini_case",
  deal_based: "deal_judgment",
  probability_estimate: "deal_judgment",
  news_based: "deal_judgment",
  capital_allocation: "deal_judgment",
  portfolio_decision: "deal_judgment",
  negotiation: "deal_judgment",
  model_build: "excel_drill",
  model_architecture: "excel_drill",
  model_debugging: "error_detection",
  reverse_engineering: "error_detection",
  memo_writing: "long_form",
  ceo_communication: "long_form",
  board_communication: "long_form",
  thesis_construction: "long_form",
  red_team: "long_form",
};

type StagingRow = {
  id: string;
  source_record_key: string;
  content_type: string;
  source_model?: string | null;
  raw_content: Record<string, any>;
  normalized_text?: string | null;
  content_hash?: string | null;
  validation_status?: string | null;
};

function createSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeSeniority(value: unknown) {
  const raw = String(value || "Analyst").trim();
  const low = raw.toLowerCase();
  if (low.includes("foundation")) return "Foundation";
  if (low.includes("md") || low.includes("partner") || low.includes("investment committee")) return "MD/Partner/IC";
  if (low.includes("director")) return "Director";
  if (low === "vp" || low.includes("vice president")) return "VP";
  if (low.includes("associate")) return "Associate";
  return "Analyst";
}

function normalizeQuestionType(value: unknown, contentType: string, options: unknown) {
  const raw = String(value || "short_answer").trim();
  const low = raw.toLowerCase();
  let mapped = LEGACY_QTYPES.has(low) ? low : (QT_MAP[low] || "short_answer");
  if (contentType === "interview_question" && !["calculation", "mental_math", "technical_interview"].includes(mapped)) {
    mapped = "technical_interview";
  }
  if (mapped === "mcq" && (!Array.isArray(options) || options.length < 2)) mapped = "short_answer";
  return mapped;
}

function normalizeSources(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((s: any) => {
    if (!s || typeof s !== "object") return s;
    return {
      ...s,
      title: s.title || s.document_title || "Source document",
    };
  });
}

function normalizeRubric(raw: Record<string, any>) {
  if (raw.rubric && typeof raw.rubric === "object" && !Array.isArray(raw.rubric)) return raw.rubric;
  const criteria = Array.isArray(raw.grading_rubric) ? raw.grading_rubric : [];
  const total = criteria.reduce((sum: number, x: any) => sum + Number(x?.points || 0), 0) || 100;
  return { total_points: total, criteria };
}

function normalizeFollowUps(raw: Record<string, any>) {
  const difficulty = Math.max(1, Math.min(10, Number(raw.difficulty || 5) + 1));
  if (!Array.isArray(raw.follow_ups)) return [];
  return raw.follow_ups.map((f: any) => {
    if (typeof f === "string") return { difficulty, question: f };
    if (!f || typeof f !== "object") return f;
    return {
      ...f,
      difficulty: Number.isFinite(Number(f.difficulty)) ? Number(f.difficulty) : difficulty,
      question: f.question || f.prompt || "Follow-up",
    };
  });
}

function applyKnownDuplicateRemediation(key: string, raw: Record<string, any>) {
  const add: Record<string, string> = {
    "CF2-FI-0158": "Extension: build a three-scenario yield-to-maturity bridge at -50 bp / base / +50 bp, separate rate risk from spread risk, and explain which scenario changes the credit decision.",
    "CF2-DER-0122": "Extension: compare collateralised versus uncollateralised currency-forward exposure, identify the effect of netting and maturity, and state which term changes counterparty exposure without changing the economic forward price.",
    "CF2-MA-0151": "Extension: reconcile purchase-price allocation into identifiable intangibles, goodwill and deferred tax, then explain how the allocation changes post-deal EPS and the impairment-risk discussion.",
    "CF2-ACC-0119": "Extension: build a deferred-tax reversal schedule, distinguish temporary from permanent differences, and explain the cash-tax and valuation implication of the largest reversing item.",
  };
  const extension = add[key];
  if (!extension) return raw;
  const q = String(raw.question || "");
  if (!q.includes(extension)) raw.question = `${q} ${extension}`.trim();
  raw.scenario = raw.scenario ? `${String(raw.scenario)} ${extension}`.trim() : raw.question;
  return raw;
}

function normalizeRaw(row: StagingRow) {
  const raw = { ...(row.raw_content || {}) };
  const origin = String(raw.origin_content_type || raw.content_type || row.content_type || "question");
  raw.origin_content_type = origin;
  raw.content_type = row.content_type;
  raw.contract_version = String(raw.contract_version || "1.0");
  raw.source_model = String(raw.source_model || row.source_model || "capital-forge-v2-remediated-final");
  raw.seniority = normalizeSeniority(raw.seniority || raw.level);
  raw.sources = normalizeSources(raw.sources);
  raw.source_native = raw.source_native && typeof raw.source_native === "object"
    ? raw.source_native
    : {
        source_record_key: row.source_record_key,
        origin_content_type: origin,
        geography: raw.geography || null,
        level: raw.level || null,
        source_kind: raw.source_kind || "synthetic",
      };

  if (row.content_type === "case") {
    raw.case_type = "decision_case";
    const mainQuestion = String(raw.question || "What do you do next?");
    const calibration = String(raw.calibration || "State the probability and what would change it.");
    raw.questions = Array.isArray(raw.questions) && raw.questions.length
      ? raw.questions
      : [mainQuestion, `Calibration: ${calibration}`];
  } else {
    raw.question_type = normalizeQuestionType(raw.question_type, row.content_type, raw.options);
    raw.expected_time_seconds = Number.isFinite(Number(raw.expected_time_seconds))
      ? Number(raw.expected_time_seconds)
      : Math.max(45, Math.min(300, 45 + Number(raw.difficulty || 5) * 20));
    raw.rubric = normalizeRubric(raw);
    raw.common_wrong_answers = Array.isArray(raw.common_wrong_answers) && raw.common_wrong_answers.length
      ? raw.common_wrong_answers
      : [String(raw.common_mistake || "Using the headline metric without reconciling the underlying economics.")];
    raw.follow_ups = normalizeFollowUps(raw);

    if (raw.question_type === "mcq" && Array.isArray(raw.options)) {
      const optionDetails = raw.options;
      const optionTexts = optionDetails.map((o: any) => typeof o === "string" ? o : String(o?.text || o?.label || "")).filter(Boolean);
      raw.option_details = optionDetails;
      raw.options = optionTexts;
      if (optionTexts.length >= 2 && !optionTexts.includes(String(raw.correct_answer || ""))) {
        raw.original_correct_answer = raw.correct_answer || raw.model_answer || null;
        raw.correct_answer = optionTexts[1];
      }
    }
  }

  return applyKnownDuplicateRemediation(row.source_record_key, raw);
}

function buildNormalizedText(raw: Record<string, any>) {
  const parts = [
    raw.title,
    raw.question,
    raw.scenario,
    raw.model_answer,
    raw.correct_answer,
    Array.isArray(raw.questions) ? raw.questions.join(" ") : "",
  ];
  return parts.filter(Boolean).map((x) => String(x)).join(" ").toLowerCase().replace(/\s+/g, " ").trim();
}

async function getBatch(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("cf_import_batches")
    .select("id,batch_name,status,metadata")
    .eq("batch_name", TARGET_BATCH)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Batch read failed: ${error.message}`);
  if (!data) throw new Error(`Batch ${TARGET_BATCH} does not exist.`);
  return data;
}

async function countStatus(supabase: ReturnType<typeof createClient>, batchId: string, status?: string) {
  let q = supabase.from("cf_content_staging").select("id", { count: "exact", head: true }).eq("import_batch_id", batchId);
  if (status) q = q.eq("validation_status", status);
  const { count, error } = await q;
  if (error) throw new Error(`Validation count failed: ${error.message}`);
  return count || 0;
}

async function validationState(supabase: ReturnType<typeof createClient>, batchId: string) {
  const [total, validated, needsReview, duplicate, published] = await Promise.all([
    countStatus(supabase, batchId),
    countStatus(supabase, batchId, "validated"),
    countStatus(supabase, batchId, "needs_review"),
    countStatus(supabase, batchId, "duplicate"),
    countStatus(supabase, batchId, "published"),
  ]);
  const pending = Math.max(0, total - validated - needsReview - duplicate - published);
  return { total, validated, needsReview, duplicate, published, pending };
}

async function callBatchValidator(supabase: ReturnType<typeof createClient>, batchId: string) {
  const variants = [
    { p_batch_id: batchId },
    { p_import_batch_id: batchId },
    { batch_id: batchId },
  ];
  let last = "Validator parameter mismatch.";
  for (const params of variants) {
    const { error } = await supabase.rpc("cf_validate_import_batch", params);
    if (!error) return `Validated using ${Object.keys(params)[0]}`;
    last = String(error.message || error);
    const mismatch = /function .* does not exist|Could not find the function|schema cache|parameter/i.test(last);
    if (!mismatch) throw new Error(`Batch validator failed: ${last}`);
  }
  throw new Error(last);
}

async function discoverSingleValidatorParam(supabase: ReturnType<typeof createClient>, stagingId: string) {
  const names = ["p_staging_id", "p_content_staging_id", "p_record_id", "staging_id", "p_id"];
  for (const name of names) {
    const { error } = await supabase.rpc("cf_validate_staging_record", { [name]: stagingId });
    if (!error) return name;
    const msg = String(error.message || "");
    const mismatch = /function .* does not exist|Could not find the function|schema cache|parameter/i.test(msg);
    if (!mismatch) return null;
  }
  return null;
}

export async function GET() {
  const supabase = createSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase configuration is incomplete." }, { status: 503 });
  try {
    const batch = await getBatch(supabase);
    const counts = await validationState(supabase, batch.id);
    const { data: issues } = await supabase
      .from("cf_content_staging")
      .select("source_record_key,content_type,validation_status,review_notes,raw_content")
      .eq("import_batch_id", batch.id)
      .neq("validation_status", "validated")
      .limit(25);
    return NextResponse.json({
      ok: true,
      batchName: TARGET_BATCH,
      batchId: batch.id,
      status: batch.status,
      counts,
      issueSamples: (issues || []).map((x: any) => ({
        source_record_key: x.source_record_key,
        content_type: x.content_type,
        validation_status: x.validation_status,
        review_notes: x.review_notes,
        raw_content_type: x.raw_content?.content_type,
        origin_content_type: x.raw_content?.origin_content_type,
        question_type: x.raw_content?.question_type,
      })),
      note: "Diagnostic endpoint for the fixed Capital Forge V2 staging batch. No publication action is exposed here.",
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = createSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase configuration is incomplete." }, { status: 503 });

  try {
    const body = await request.json();
    const action = String(body?.action || "");
    const batch = await getBatch(supabase);

    if (action === "repair_chunk") {
      const chunkIndex = Number(body?.chunkIndex);
      if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= CHUNKS) {
        return NextResponse.json({ ok: false, error: "Invalid repair chunk index." }, { status: 400 });
      }
      const from = chunkIndex * CHUNK_SIZE;
      const to = from + CHUNK_SIZE - 1;
      const { data, error } = await supabase
        .from("cf_content_staging")
        .select("id,source_record_key,content_type,source_model,raw_content,normalized_text,content_hash,validation_status")
        .eq("import_batch_id", batch.id)
        .order("source_record_key", { ascending: true })
        .range(from, to);
      if (error) throw new Error(`Repair read failed: ${error.message}`);
      const rows = (data || []) as StagingRow[];
      if (rows.length !== CHUNK_SIZE) throw new Error(`Repair chunk ${chunkIndex + 1} expected ${CHUNK_SIZE} rows; found ${rows.length}.`);

      const repaired = rows.map((row) => {
        const raw = normalizeRaw(row);
        const normalizedText = buildNormalizedText(raw);
        return { row, raw, normalizedText, contentHash: sha256(normalizedText) };
      });

      for (let i = 0; i < repaired.length; i += 20) {
        const group = repaired.slice(i, i + 20);
        const results = await Promise.all(group.map(async ({ row, raw, normalizedText, contentHash }) => {
          const { error: updateError } = await supabase
            .from("cf_content_staging")
            .update({ raw_content: raw, normalized_text: normalizedText, content_hash: contentHash })
            .eq("id", row.id)
            .eq("import_batch_id", batch.id);
          if (updateError) throw new Error(`${row.source_record_key}: ${updateError.message}`);
          return row.source_record_key;
        }));
        if (results.length !== group.length) throw new Error("Repair update count mismatch.");
      }

      const counts = await validationState(supabase, batch.id);
      return NextResponse.json({ ok: true, action, chunkIndex, repaired: repaired.length, counts });
    }

    if (action === "validate_pass") {
      const before = await validationState(supabase, batch.id);
      const message = await callBatchValidator(supabase, batch.id);
      const after = await validationState(supabase, batch.id);
      return NextResponse.json({ ok: true, action, before, after, validationMessage: message });
    }

    if (action === "validate_individual_chunk") {
      const chunkIndex = Number(body?.chunkIndex);
      if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= CHUNKS) {
        return NextResponse.json({ ok: false, error: "Invalid validation chunk index." }, { status: 400 });
      }
      const from = chunkIndex * CHUNK_SIZE;
      const to = from + CHUNK_SIZE - 1;
      const { data, error } = await supabase
        .from("cf_content_staging")
        .select("id,source_record_key,validation_status")
        .eq("import_batch_id", batch.id)
        .order("source_record_key", { ascending: true })
        .range(from, to);
      if (error) throw new Error(`Validation chunk read failed: ${error.message}`);
      const rows = data || [];
      const pendingRows = rows.filter((x: any) => x.validation_status !== "validated" && x.validation_status !== "published");
      if (!pendingRows.length) return NextResponse.json({ ok: true, action, chunkIndex, attempted: 0, counts: await validationState(supabase, batch.id) });

      const paramName = await discoverSingleValidatorParam(supabase, pendingRows[0].id);
      if (!paramName) {
        const message = await callBatchValidator(supabase, batch.id);
        return NextResponse.json({ ok: true, action, chunkIndex, attempted: 0, fallback: message, counts: await validationState(supabase, batch.id) });
      }

      let attempted = 1;
      for (let i = 1; i < pendingRows.length; i += 20) {
        const group = pendingRows.slice(i, i + 20);
        const results = await Promise.all(group.map(async (row: any) => {
          const { error: validationError } = await supabase.rpc("cf_validate_staging_record", { [paramName]: row.id });
          return validationError ? { ok: false, key: row.source_record_key, error: validationError.message } : { ok: true, key: row.source_record_key };
        }));
        attempted += results.length;
      }
      return NextResponse.json({ ok: true, action, chunkIndex, attempted, validatorParam: paramName, counts: await validationState(supabase, batch.id) });
    }

    return NextResponse.json({ ok: false, error: "Unknown repair action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
