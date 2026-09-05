import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN_SHA256 = "4d7054695a26bdcfebe447d506f0d600af23abeffe516e5f7d52d49493b5b436";
const MANIFEST_SHA256 = "909825ad82afd071884df169134f19629abcbdd0ad38ddbd709a71bdb7b0ac8c";
const BATCH_ID = "91b16582-a135-42e8-a11b-374ac6268e17";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function tokenMatches(value: string | null) {
  const supplied = (value || "").trim();
  if (!supplied) return false;
  const actual = createHash("sha256").update(supplied).digest();
  const expected = Buffer.from(TOKEN_SHA256, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  const suppliedToken = request.headers.get("x-capital-forge-remediate");
  if (!tokenMatches(suppliedToken)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const text = await request.text();
  if (sha256(text) !== MANIFEST_SHA256) {
    return NextResponse.json(
      { ok: false, error: "Verification manifest checksum mismatch. Use the updated exact 204-object file generated after structural remediation." },
      { status: 400 }
    );
  }

  let manifest: any;
  try {
    manifest = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON manifest" }, { status: 400 });
  }

  if (
    manifest?.batch_id !== BATCH_ID ||
    manifest?.calculation_objects !== 204 ||
    !Array.isArray(manifest?.records) ||
    manifest.records.length !== 204
  ) {
    return NextResponse.json({ ok: false, error: "Manifest contract mismatch" }, { status: 400 });
  }

  if (
    !manifest.records.every(
      (r: any) =>
        r?.verified === true &&
        typeof r?.source_record_key === "string" &&
        typeof r?.evidence_sha256 === "string"
    )
  ) {
    return NextResponse.json({ ok: false, error: "Manifest contains an unverified or malformed record" }, { status: 400 });
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
    .select("id,source_record_key,raw_content,deterministic_status")
    .eq("import_batch_id", BATCH_ID)
    .contains("raw_content", { calculation_required: true });

  if (error) return NextResponse.json({ ok: false, stage: "read", error: error.message }, { status: 500 });
  if ((rows || []).length !== 204) {
    return NextResponse.json(
      { ok: false, error: `Expected 204 calculation rows in staging; found ${(rows || []).length}.` },
      { status: 409 }
    );
  }

  const byKey = new Map((rows || []).map((r: any) => [r.source_record_key, r]));
  const mismatches: any[] = [];

  for (const rec of manifest.records) {
    const row: any = byKey.get(rec.source_record_key);
    if (!row) {
      mismatches.push({ key: rec.source_record_key, reason: "missing staging row" });
      continue;
    }
    const raw: any = row.raw_content || {};
    const canonical = `{"correct_answer":${JSON.stringify(raw.correct_answer)},"key":${JSON.stringify(rec.source_record_key)},"model_answer":${JSON.stringify(raw.model_answer)},"question":${JSON.stringify(raw.question)}}`;
    if (sha256(canonical) !== rec.evidence_sha256) {
      mismatches.push({ key: rec.source_record_key, reason: "content evidence changed" });
    }
  }

  if (mismatches.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "Evidence mismatch; no deterministic statuses were changed.",
        mismatches: mismatches.slice(0, 20),
        mismatchCount: mismatches.length,
      },
      { status: 409 }
    );
  }

  let updated = 0;
  for (const rec of manifest.records) {
    const row: any = byKey.get(rec.source_record_key);
    const { error: updateError } = await supabase
      .from("cf_content_staging")
      .update({
        deterministic_status: "passed",
        deterministic_score: 100,
        deterministic_result: {
          verifier: "capital-forge-calculation-audit-v2",
          verification_method: rec.verification_method,
          semantic_rule: rec.semantic_rule,
          equations_checked: rec.equations_checked,
          notes: rec.notes,
          expected_answer_text: rec.expected_answer_text,
          evidence_sha256: rec.evidence_sha256,
          manifest_sha256: MANIFEST_SHA256,
        },
        calculation_validated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateError) {
      return NextResponse.json(
        {
          ok: false,
          stage: "update",
          key: rec.source_record_key,
          error: updateError.message,
          updatedBeforeFailure: updated,
        },
        { status: 500 }
      );
    }
    updated++;
  }

  const { data: after, error: afterError } = await supabase
    .from("cf_content_staging")
    .select("deterministic_status,validation_status,content_type,source_record_key")
    .eq("import_batch_id", BATCH_ID);

  if (afterError) return NextResponse.json({ ok: false, stage: "summary", error: afterError.message }, { status: 500 });

  const deterministic: Record<string, number> = {};
  const structural: Record<string, number> = {};
  for (const r of after || []) {
    deterministic[String(r.deterministic_status)] =
      (deterministic[String(r.deterministic_status)] || 0) + 1;
    const k = `${r.content_type} / ${r.validation_status}`;
    structural[k] = (structural[k] || 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    batchId: BATCH_ID,
    verifiedCalculationObjects: updated,
    deterministicStatusSummary: deterministic,
    structuralStatusSummary: structural,
    note: "Calculation verification applied only to the exact checksum-locked 204-object manifest. Nothing was published.",
  });
}
