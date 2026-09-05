import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StagingRow = {
  source_type?: string;
  source_model?: string;
  content_type: string;
  source_record_key: string;
  content_hash?: string | null;
  normalized_text?: string | null;
  detected_domain?: string | null;
  detected_topic?: string | null;
  proposed_difficulty?: number | null;
  raw_content: Record<string, unknown>;
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function normalizeInput(payload: unknown): StagingRow[] {
  if (Array.isArray(payload)) return payload as StagingRow[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { objects?: unknown[] }).objects)) {
    return ((payload as { objects: Array<Record<string, unknown>> }).objects || []).map((o) => ({
      source_type: typeof o.source_type === "string" ? o.source_type : "manual",
      source_model: typeof o.source_model === "string" ? o.source_model : "capital-forge-import",
      content_type: String(o.content_type || "question"),
      source_record_key: String(o.source_record_key || ""),
      content_hash: typeof o.content_hash === "string" ? o.content_hash : null,
      normalized_text: typeof o.normalized_text === "string" ? o.normalized_text : null,
      detected_domain: typeof o.detected_domain === "string"
        ? o.detected_domain
        : typeof o.domain === "string"
          ? o.domain
          : null,
      detected_topic: typeof o.detected_topic === "string"
        ? o.detected_topic
        : typeof o.topic === "string"
          ? o.topic
          : null,
      proposed_difficulty: typeof o.proposed_difficulty === "number"
        ? o.proposed_difficulty
        : typeof o.difficulty === "number"
          ? o.difficulty
          : null,
      raw_content: (o.raw_content || o) as Record<string, unknown>,
    }));
  }
  throw new Error("Payload must be a staging array or a normalized manifest with an objects array.");
}

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
    const rows = normalizeInput(body?.payload ?? body);
    const objectCount = rows.length;
    const expectedTotalRaw = Number(body?.expectedTotal ?? objectCount);
    const expectedTotal = Number.isInteger(expectedTotalRaw) ? expectedTotalRaw : objectCount;
    const chunkIndexRaw = Number(body?.chunkIndex ?? 0);
    const totalChunksRaw = Number(body?.totalChunks ?? 1);
    const chunkIndex = Number.isInteger(chunkIndexRaw) ? chunkIndexRaw : 0;
    const totalChunks = Number.isInteger(totalChunksRaw) ? totalChunksRaw : 1;
    const finalize = body?.finalize === true || totalChunks === 1;

    const batchName = typeof body?.batchName === "string" && body.batchName.trim()
      ? body.batchName.trim()
      : "CF-CONTENT-IMPORT-MANUAL";
    const originalFilename = typeof body?.filename === "string" && body.filename.trim()
      ? body.filename.trim()
      : "capital_forge_staging_payload.json";

    if (objectCount === 0) {
      return NextResponse.json({ ok: false, error: "Import chunk is empty." }, { status: 400 });
    }
    if (objectCount > 250) {
      return NextResponse.json({ ok: false, error: `Each protected request may contain at most 250 objects; received ${objectCount}. Use chunked upload.` }, { status: 400 });
    }
    if (expectedTotal <= 0 || expectedTotal > 5000) {
      return NextResponse.json({ ok: false, error: `Expected batch total must be between 1 and 5,000; received ${expectedTotal}.` }, { status: 400 });
    }
    if (chunkIndex < 0 || totalChunks < 1 || chunkIndex >= totalChunks) {
      return NextResponse.json({ ok: false, error: "Invalid chunkIndex/totalChunks metadata." }, { status: 400 });
    }

    const keys = rows.map((r) => String(r.source_record_key || "").trim()).filter(Boolean);
    if (keys.length !== objectCount || new Set(keys).size !== objectCount) {
      return NextResponse.json({ ok: false, error: `Chunk must contain ${objectCount} non-empty unique source_record_key values.` }, { status: 400 });
    }

    for (const row of rows) {
      if (!row.content_type || !row.raw_content || typeof row.raw_content !== "object") {
        return NextResponse.json({ ok: false, error: `Invalid content_type/raw_content on ${row.source_record_key}.` }, { status: 400 });
      }
    }

    const domainTopicPairs = new Map<string, { domain: string; topic: string }>();
    const sourceModels = new Set<string>();
    for (const row of rows) {
      const domain = row.detected_domain || String(row.raw_content?.domain || "");
      const topic = row.detected_topic || String(row.raw_content?.topic || "");
      if (!domain || !topic) {
        return NextResponse.json({ ok: false, error: `Missing domain/topic on ${row.source_record_key}.` }, { status: 400 });
      }
      domainTopicPairs.set(`${domain}|||${topic}`, { domain, topic });
      if (row.source_model) sourceModels.add(row.source_model);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const domainNames = [...new Set([...domainTopicPairs.values()].map((x) => x.domain))].sort();
    const domainRows = domainNames.map((name, idx) => ({
      slug: slugify(name),
      name,
      description: `Capital Forge normalized content domain: ${name}.`,
      sort_order: 100 + idx * 10,
      active: true,
    }));

    const { error: domainUpsertError } = await supabase
      .from("cf_domains")
      .upsert(domainRows, { onConflict: "slug", ignoreDuplicates: true });
    if (domainUpsertError) throw new Error(`Domain upsert failed: ${domainUpsertError.message}`);

    const { data: domainData, error: domainReadError } = await supabase
      .from("cf_domains")
      .select("id,slug,name")
      .in("slug", domainRows.map((d) => d.slug));
    if (domainReadError) throw new Error(`Domain read failed: ${domainReadError.message}`);

    const domainIdBySlug = new Map((domainData || []).map((d) => [d.slug, d.id]));
    if (domainIdBySlug.size !== domainRows.length) {
      throw new Error(`Expected ${domainRows.length} normalized domains in this chunk; resolved ${domainIdBySlug.size}.`);
    }

    const topicRows = [...domainTopicPairs.values()].map(({ domain, topic }) => ({
      domain_id: domainIdBySlug.get(slugify(domain)),
      slug: slugify(topic),
      name: topic,
      description: `Imported Capital Forge topic: ${topic}.`,
      difficulty_min: 1,
      difficulty_max: 10,
      active: true,
    }));

    for (const part of chunk(topicRows, 100)) {
      const { error } = await supabase
        .from("cf_topics")
        .upsert(part, { onConflict: "domain_id,slug", ignoreDuplicates: true });
      if (error) throw new Error(`Topic upsert failed: ${error.message}`);
    }

    let { data: batch, error: batchReadError } = await supabase
      .from("cf_import_batches")
      .select("id,batch_name,status")
      .eq("batch_name", batchName)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (batchReadError) throw new Error(`Import batch read failed: ${batchReadError.message}`);

    if (!batch) {
      const { data, error } = await supabase
        .from("cf_import_batches")
        .insert({
          batch_name: batchName,
          source_type: "json",
          source_model: sourceModels.size === 1 ? [...sourceModels][0] : "capital-forge-mixed-import",
          original_filename: originalFilename,
          status: "staging",
          metadata: {
            source: "Capital Forge protected chunked content importer",
            expected_object_count: expectedTotal,
            total_chunks: totalChunks,
            parser_contract: "capital-forge-staging-import-v3-chunked",
          },
        })
        .select("id,batch_name,status")
        .single();
      if (error) throw new Error(`Import batch creation failed: ${error.message}`);
      batch = data;
    }

    const existing = new Set<string>();
    for (const part of chunk(keys, 100)) {
      const { data, error } = await supabase
        .from("cf_content_staging")
        .select("source_record_key,import_batch_id")
        .in("source_record_key", part);
      if (error) throw new Error(`Existing-key lookup failed: ${error.message}`);
      for (const row of data || []) existing.add(row.source_record_key);
    }

    const newRows = rows
      .filter((r) => !existing.has(r.source_record_key))
      .map((r) => ({
        import_batch_id: batch!.id,
        source_type: r.source_type || "manual",
        source_model: r.source_model || "capital-forge-import",
        content_type: r.content_type,
        source_record_key: r.source_record_key,
        raw_content: r.raw_content,
        detected_domain: r.detected_domain,
        detected_topic: r.detected_topic,
        proposed_difficulty: r.proposed_difficulty,
        content_hash: r.content_hash,
        normalized_text: r.normalized_text,
      }));

    for (const part of chunk(newRows, 40)) {
      const { error } = await supabase.from("cf_content_staging").insert(part);
      if (error) throw new Error(`Staging insert failed: ${error.message}`);
    }

    const { count: stagedCount, error: countError } = await supabase
      .from("cf_content_staging")
      .select("id", { count: "exact", head: true })
      .eq("import_batch_id", batch.id);
    if (countError) throw new Error(`Staging count failed: ${countError.message}`);

    if (!finalize) {
      await supabase.from("cf_import_batches").update({ status: "staging" }).eq("id", batch.id);
      return NextResponse.json({
        ok: true,
        partial: true,
        batchName: batch.batch_name,
        batchId: batch.id,
        sourceObjects: expectedTotal,
        chunkObjects: objectCount,
        chunkIndex,
        totalChunks,
        existingKeysSkipped: existing.size,
        inserted: newRows.length,
        stagedObjectsInBatch: stagedCount || 0,
        validationCalled: false,
        validationMessage: "Deferred until final chunk.",
        published: 0,
        note: "Chunk staged successfully; batch is not yet finalized or published.",
      });
    }

    if ((stagedCount || 0) !== expectedTotal) {
      await supabase.from("cf_import_batches").update({ status: "staging" }).eq("id", batch.id);
      return NextResponse.json({
        ok: false,
        error: `Finalization refused: expected ${expectedTotal} staged objects in batch, found ${stagedCount || 0}. Retry the same import; completed chunks are idempotently skipped.`,
        batchName: batch.batch_name,
        batchId: batch.id,
        stagedObjectsInBatch: stagedCount || 0,
        sourceObjects: expectedTotal,
        chunkIndex,
        totalChunks,
      }, { status: 409 });
    }

    await supabase.from("cf_import_batches").update({ status: "staged" }).eq("id", batch.id);

    let validationCalled = false;
    let validationMessage = "Not attempted";
    const variants = [
      { p_batch_id: batch.id },
      { p_import_batch_id: batch.id },
      { batch_id: batch.id },
    ];
    for (const params of variants) {
      const { error } = await supabase.rpc("cf_validate_import_batch", params);
      if (!error) {
        validationCalled = true;
        validationMessage = `Validated using ${Object.keys(params)[0]}`;
        break;
      }
      const message = String(error.message || "");
      const mismatch = /function .* does not exist|Could not find the function|schema cache|parameter/i.test(message);
      validationMessage = message;
      if (!mismatch) break;
    }

    const { data: stagedRows, error: summaryError } = await supabase
      .from("cf_content_staging")
      .select("content_type,validation_status,deterministic_status,source_record_key")
      .eq("import_batch_id", batch.id);
    if (summaryError) throw new Error(`Import summary read failed: ${summaryError.message}`);

    const statusSummary: Record<string, number> = {};
    for (const row of stagedRows || []) {
      const key = `${row.content_type} / ${row.validation_status}`;
      statusSummary[key] = (statusSummary[key] || 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      partial: false,
      batchName: batch.batch_name,
      batchId: batch.id,
      sourceObjects: expectedTotal,
      chunkObjects: objectCount,
      chunkIndex,
      totalChunks,
      existingKeysSkipped: existing.size,
      inserted: newRows.length,
      stagedObjectsInBatch: stagedRows?.length || 0,
      validationCalled,
      validationMessage,
      statusSummary,
      published: 0,
      note: "All chunks staged. Nothing is automatically published; structural validation, deterministic calculation verification, qualitative review and publication gates remain in force.",
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
