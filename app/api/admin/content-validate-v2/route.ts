import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StagingStatusRow = {
  content_type: string | null;
  validation_status: string | null;
  deterministic_status: string | null;
  source_record_key: string;
};

async function fetchAllStatusRows(supabase: ReturnType<typeof createClient>, batchId: string) {
  const all: StagingStatusRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("cf_content_staging")
      .select("content_type,validation_status,deterministic_status,source_record_key")
      .eq("import_batch_id", batchId)
      .order("source_record_key", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Status read failed: ${error.message}`);
    const rows = (data || []) as StagingStatusRow[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

function summarize(rows: StagingStatusRow[]) {
  const byValidation: Record<string, number> = {};
  const byDeterministic: Record<string, number> = {};
  const byTypeValidation: Record<string, number> = {};
  for (const row of rows) {
    const validation = row.validation_status || "NULL";
    const deterministic = row.deterministic_status || "NULL";
    const type = row.content_type || "NULL";
    byValidation[validation] = (byValidation[validation] || 0) + 1;
    byDeterministic[deterministic] = (byDeterministic[deterministic] || 0) + 1;
    const tv = `${type} / ${validation}`;
    byTypeValidation[tv] = (byTypeValidation[tv] || 0) + 1;
  }
  return { byValidation, byDeterministic, byTypeValidation };
}

export async function POST(request: Request) {
  const adminSecret = process.env.CAPITAL_FORGE_ADMIN_SECRET;
  const suppliedSecret = request.headers.get("x-capital-forge-admin");
  if (!adminSecret) return NextResponse.json({ ok: false, error: "CAPITAL_FORGE_ADMIN_SECRET is not configured." }, { status: 503 });
  if (!suppliedSecret || suppliedSecret !== adminSecret) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ ok: false, error: "Supabase server configuration is incomplete." }, { status: 503 });

  try {
    const body = await request.json();
    const batchId = String(body?.batchId || "").trim();
    const batchName = String(body?.batchName || "").trim();
    if (!batchId && !batchName) return NextResponse.json({ ok: false, error: "batchId or batchName is required." }, { status: 400 });

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    let q = supabase.from("cf_import_batches").select("id,batch_name,status,metadata,created_at");
    q = batchId ? q.eq("id", batchId) : q.eq("batch_name", batchName);
    const { data: batch, error: batchError } = await q.order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (batchError) throw new Error(`Batch lookup failed: ${batchError.message}`);
    if (!batch) return NextResponse.json({ ok: false, error: "Import batch not found." }, { status: 404 });

    const beforeRows = await fetchAllStatusRows(supabase, batch.id);
    if (beforeRows.length !== 2000) {
      return NextResponse.json({ ok: false, error: `Validation refused: expected 2,000 staged objects, found ${beforeRows.length}.`, batchId: batch.id, batchName: batch.batch_name }, { status: 409 });
    }

    const attempts: Array<{ params: Record<string, string>; label: string }> = [
      { params: { p_batch_id: batch.id }, label: "p_batch_id" },
      { params: { p_import_batch_id: batch.id }, label: "p_import_batch_id" },
      { params: { batch_id: batch.id }, label: "batch_id" },
    ];

    let validationCalled = false;
    let validationMessage = "Not attempted";
    const rpcErrors: Array<{ parameter: string; message: string }> = [];

    for (const attempt of attempts) {
      const { error } = await supabase.rpc("cf_validate_import_batch", attempt.params);
      if (!error) {
        validationCalled = true;
        validationMessage = `cf_validate_import_batch succeeded using ${attempt.label}`;
        break;
      }
      const message = String(error.message || "");
      rpcErrors.push({ parameter: attempt.label, message });
      const signatureMismatch = /function .* does not exist|Could not find the function|schema cache|parameter/i.test(message);
      if (!signatureMismatch) {
        validationMessage = message;
        break;
      }
      validationMessage = message;
    }

    const afterRows = await fetchAllStatusRows(supabase, batch.id);
    const summary = summarize(afterRows);

    const invalidSamples = afterRows
      .filter((row) => !["valid", "validated", "passed", "ready", "approved"].includes(String(row.validation_status || "").toLowerCase()))
      .slice(0, 25)
      .map((row) => ({ source_record_key: row.source_record_key, content_type: row.content_type, validation_status: row.validation_status }));

    return NextResponse.json({
      ok: validationCalled,
      batchId: batch.id,
      batchName: batch.batch_name,
      batchStatus: batch.status,
      stagedObjects: afterRows.length,
      validationCalled,
      validationMessage,
      rpcErrors,
      summary,
      invalidSamples,
      published: 0,
      nextStep: validationCalled ? "Review structural validation results, then run deterministic calculation verification." : "Fix validator invocation/signature before any publication action.",
      note: "This endpoint performs structural batch validation only. It does not publish content.",
    }, { status: validationCalled ? 200 : 500 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
