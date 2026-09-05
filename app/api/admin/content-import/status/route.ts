import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const adminSecret = process.env.CAPITAL_FORGE_ADMIN_SECRET;
  const suppliedSecret = request.headers.get("x-capital-forge-admin");
  if (!adminSecret) {
    return NextResponse.json({ ok: false, error: "CAPITAL_FORGE_ADMIN_SECRET is not configured." }, { status: 503 });
  }
  if (!suppliedSecret || suppliedSecret !== adminSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "Supabase server configuration is incomplete." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const batchName = String(body?.batchName || "").trim();
    if (!batchName) {
      return NextResponse.json({ ok: false, error: "batchName is required." }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: batch, error: batchError } = await supabase
      .from("cf_import_batches")
      .select("id,batch_name,status,metadata,created_at")
      .eq("batch_name", batchName)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (batchError) throw new Error(`Batch lookup failed: ${batchError.message}`);
    if (!batch) {
      return NextResponse.json({ ok: true, exists: false, batchName, stagedObjects: 0, uploadedParts: [], status: "not_started" });
    }

    const { count, error: countError } = await supabase
      .from("cf_content_staging")
      .select("id", { count: "exact", head: true })
      .eq("import_batch_id", batch.id);
    if (countError) throw new Error(`Staging count failed: ${countError.message}`);

    const { data: stagedRows, error: rowsError } = await supabase
      .from("cf_content_staging")
      .select("content_type,validation_status,deterministic_status")
      .eq("import_batch_id", batch.id);
    if (rowsError) throw new Error(`Staging summary failed: ${rowsError.message}`);

    const statusSummary: Record<string, number> = {};
    const deterministicSummary: Record<string, number> = {};
    for (const row of stagedRows || []) {
      const validationKey = `${row.content_type} / ${row.validation_status || "null"}`;
      statusSummary[validationKey] = (statusSummary[validationKey] || 0) + 1;
      const deterministicKey = String(row.deterministic_status || "null");
      deterministicSummary[deterministicKey] = (deterministicSummary[deterministicKey] || 0) + 1;
    }

    const metadata = (batch.metadata || {}) as Record<string, unknown>;
    const uploadedParts = Array.isArray(metadata.uploaded_parts) ? metadata.uploaded_parts : [];
    const expectedTotal = Number(metadata.expected_object_count || metadata.object_count || 0) || null;
    const totalParts = Number(metadata.total_parts || metadata.total_chunks || 0) || null;

    return NextResponse.json({
      ok: true,
      exists: true,
      batchId: batch.id,
      batchName: batch.batch_name,
      status: batch.status,
      createdAt: batch.created_at,
      stagedObjects: count || 0,
      expectedTotal,
      totalParts,
      uploadedParts,
      statusSummary,
      deterministicSummary,
      metadata,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
