import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN_SHA256 = "4d7054695a26bdcfebe447d506f0d600af23abeffe516e5f7d52d49493b5b436";
const BATCH_ID = "91b16582-a135-42e8-a11b-374ac6268e17";
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

function tokenMatches(value: string | null) {
  const supplied = (value || "").trim();
  if (!supplied) return false;
  const actual = createHash("sha256").update(supplied).digest();
  const expected = Buffer.from(TOKEN_SHA256, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function isMissingFunction(message: string) {
  return /function .* does not exist|Could not find the function|schema cache/i.test(message);
}

async function checkPublisherAvailable(supabase: any, fn: string) {
  const { error } = await supabase.rpc(fn, { p_staging_id: ZERO_UUID });
  if (!error) return { ok: true, note: "available" };
  const message = String(error.message || "");
  if (isMissingFunction(message)) return { ok: false, error: message };
  // A business-logic error for a deliberately nonexistent staging UUID still proves
  // the RPC exists; the real publication call will use valid staging IDs.
  return { ok: true, note: message };
}

async function callPublisher(supabase: any, fn: string, id: string) {
  const variants = [{ p_staging_id: id }, { staging_id: id }, { p_id: id }];
  let last = "";
  for (const params of variants) {
    const { data, error } = await supabase.rpc(fn, params);
    if (!error) return { ok: true, data };
    last = String(error.message || "");
    if (!/function .* does not exist|Could not find the function|schema cache|parameter/i.test(last)) break;
  }
  return { ok: false, error: last };
}

export async function POST(request: NextRequest) {
  if (!tokenMatches(request.headers.get("x-capital-forge-remediate"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try { body = await request.json(); } catch {}
  if (body?.confirm !== "PUBLISH_605") {
    return NextResponse.json(
      { ok: false, error: "Explicit confirmation missing. Send confirm=PUBLISH_605." },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Supabase server configuration incomplete" }, { status: 503 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: staging, error: readError } = await supabase
    .from("cf_content_staging")
    .select("id,source_record_key,content_type,publication_decision,published_entity_id,validation_status,deterministic_status,raw_content")
    .eq("import_batch_id", BATCH_ID)
    .order("source_record_key");

  if (readError) return NextResponse.json({ ok: false, stage: "read", error: readError.message }, { status: 500 });
  if ((staging || []).length !== 605) {
    return NextResponse.json({ ok: false, error: `Expected 605 staging objects; found ${(staging || []).length}.` }, { status: 409 });
  }

  const typeCounts: Record<string, number> = {};
  for (const r of staging || []) typeCounts[String(r.content_type)] = (typeCounts[String(r.content_type)] || 0) + 1;
  if (typeCounts.question !== 497 || typeCounts.case !== 105 || typeCounts.interview_question !== 3) {
    return NextResponse.json(
      {
        ok: false,
        error: "Canonical publication blocked: staged content-type counts no longer match the reviewed 605-object batch.",
        typeCounts,
        expected: { question: 497, case: 105, interview_question: 3 },
      },
      { status: 409 }
    );
  }

  const notReady = (staging || []).filter(
    (r: any) => r.publication_decision !== "ready_to_publish" && r.publication_decision !== "published"
  );
  const structural = (staging || []).filter(
    (r: any) => r.validation_status !== "validated" && r.validation_status !== "published"
  );
  const calculationRows = (staging || []).filter((r: any) => r.raw_content?.calculation_required === true);
  const calcBlockers = calculationRows.filter((r: any) => r.deterministic_status !== "passed");

  if (notReady.length || structural.length || calculationRows.length !== 204 || calcBlockers.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "Publication blocked by pre-flight invariants.",
        notReady: notReady.length,
        structuralBlockers: structural.length,
        calculationObjects: calculationRows.length,
        calculationBlockers: calcBlockers.length,
        sample: [...notReady, ...structural, ...calcBlockers].slice(0, 20).map((r: any) => ({
          key: r.source_record_key,
          decision: r.publication_decision,
          status: r.validation_status,
          deterministic: r.deterministic_status,
        })),
      },
      { status: 409 }
    );
  }

  // Confirm both proven canonical publishers are present before changing any row.
  const questionPublisher = await checkPublisherAvailable(supabase, "cf_publish_question_v2");
  const nonpracticePublisher = await checkPublisherAvailable(supabase, "cf_publish_nonpractice_object_v1");
  if (!questionPublisher.ok || !nonpracticePublisher.ok) {
    return NextResponse.json(
      {
        ok: false,
        stage: "publisher_preflight",
        error: "Required canonical publisher RPC is unavailable. Nothing was published by this request.",
        questionPublisher,
        nonpracticePublisher,
      },
      { status: 503 }
    );
  }

  let published = 0;
  let already = 0;
  const failures: any[] = [];

  // Cases/interview first exercise the schema-adaptive nonpractice publisher before
  // the larger question set. The operation is idempotent through staging lineage.
  const ordered = [...(staging || [])].sort((a: any, b: any) => {
    const rank = (type: string) => (type === "case" ? 0 : type === "interview_question" ? 1 : 2);
    return rank(a.content_type) - rank(b.content_type) || String(a.source_record_key).localeCompare(String(b.source_record_key));
  });

  for (const s of ordered) {
    if (s.published_entity_id || s.publication_decision === "published") {
      already++;
      continue;
    }
    const fn = s.content_type === "question" ? "cf_publish_question_v2" : "cf_publish_nonpractice_object_v1";
    const result = await callPublisher(supabase, fn, s.id);
    if (!result.ok) {
      failures.push({ key: s.source_record_key, type: s.content_type, function: fn, error: result.error });
      break;
    }
    published++;
  }

  if (failures.length) {
    return NextResponse.json(
      {
        ok: false,
        stage: "publish",
        publishedBeforeFailure: published,
        alreadyPublished: already,
        failures,
        note: "The publisher is idempotent. Any successfully linked rows remain canonical and a corrected retry will skip them.",
      },
      { status: 500 }
    );
  }

  const { error: batchUpdateError } = await supabase
    .from("cf_import_batches")
    .update({ status: "published" })
    .eq("id", BATCH_ID);
  if (batchUpdateError) {
    return NextResponse.json({ ok: false, stage: "batch_status", error: batchUpdateError.message }, { status: 500 });
  }

  const { data: after, error: afterError } = await supabase
    .from("cf_content_staging")
    .select("source_record_key,content_type,publication_decision,published_entity_id")
    .eq("import_batch_id", BATCH_ID);

  if (afterError) return NextResponse.json({ ok: false, stage: "summary", error: afterError.message }, { status: 500 });

  const linked = (after || []).filter((r: any) => r.published_entity_id).length;
  const byType: Record<string, number> = {};
  for (const r of after || []) {
    if (r.published_entity_id) byType[r.content_type] = (byType[r.content_type] || 0) + 1;
  }
  const remaining = (after || []).filter(
    (r: any) => !r.published_entity_id || r.publication_decision !== "published"
  );

  const expectedLinked =
    linked === 605 &&
    byType.question === 497 &&
    byType.case === 105 &&
    byType.interview_question === 3;

  return NextResponse.json(
    {
      ok: remaining.length === 0 && expectedLinked,
      batchId: BATCH_ID,
      newlyPublished: published,
      alreadyPublished: already,
      canonicalLinked: linked,
      publishedByType: byType,
      remainingUnlinked: remaining.length,
      remainingSample: remaining.slice(0, 20).map((r: any) => ({
        key: r.source_record_key,
        type: r.content_type,
        decision: r.publication_decision,
        entity: r.published_entity_id,
      })),
      note:
        remaining.length === 0 && expectedLinked
          ? "All 605 imported objects are canonically published and lineage-linked."
          : "Some objects remain unlinked or type counts do not match the reviewed batch; review before retrying.",
    },
    { status: remaining.length === 0 && expectedLinked ? 200 : 409 }
  );
}
