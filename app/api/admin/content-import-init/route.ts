import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TARGET_BATCH = "CF-V2-2000-20260905-001";
const SOURCE_MODEL = "capital-forge-v2-remediated-final";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "Supabase server configuration is incomplete." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const { data: existing, error: readError } = await supabase
      .from("cf_import_batches")
      .select("id,batch_name,status,metadata")
      .eq("batch_name", TARGET_BATCH)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (readError) throw new Error(`Batch read failed: ${readError.message}`);
    if (existing) {
      return NextResponse.json({
        ok: true,
        created: false,
        batchId: existing.id,
        batchName: existing.batch_name,
        status: existing.status,
        note: "Batch already exists; no write performed.",
      });
    }

    const { data, error } = await supabase
      .from("cf_import_batches")
      .insert({
        batch_name: TARGET_BATCH,
        source_type: "json",
        source_model: SOURCE_MODEL,
        original_filename: "capital_forge_2000_split_20x100",
        status: "created",
        metadata: {
          source: "Capital Forge V2 one-time direct importer initializer",
          expected_object_count: 2000,
          total_chunks: 20,
          uploaded_files: [],
          parser_contract: "capital-forge-direct-v2-exact-chunk-signatures",
        },
      })
      .select("id,batch_name,status")
      .single();

    if (error) throw new Error(`Batch initialization failed: ${error.message}`);

    return NextResponse.json({
      ok: true,
      created: true,
      batchId: data.id,
      batchName: data.batch_name,
      status: data.status,
      note: "V2 import batch initialized with an allowed status. Upload can continue.",
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
