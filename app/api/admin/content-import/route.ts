import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TARGET_BATCH = "CF-V2-2000-20260905-001";
const SOURCE_MODEL = "capital-forge-v2-remediated-final";
const EXPECTED_TOTAL = 2000;
const EXPECTED_CHUNKS = 20;
const EXPECTED_CHUNK_SIZE = 100;

// Logical signatures of [source_record_key, content_hash] for the exact 20 V2 chunks.
// This permits direct upload without exposing an admin secret while refusing arbitrary public writes.
const EXPECTED_CHUNK_SIGNATURES = [
  "a6664b89daef25553f1e291762a810346f3a034b48339cff3d2cad0eb3a42e71",
  "4cf48b67d0467a2c7da5fe112759baffa964051451a0d97fab1515d0fa1944d5",
  "127f1be432c1fd54b7804789b740de0749e091310cfd1940115d8d9a53b367ee",
  "09b1393240bc73f354227b2325d96b0e80e887f10f4c8e570d5a646da0a0b40a",
  "cd7e9936b93c8d295d8b1384fed731fdc21b2a90c4232e1326cc184b6f64f04d",
  "cbe91ed4644cac95e71773180d538094bfb649ea7ea50cd2004cc131f34ef1b3",
  "5fcb9e5c6ce8c500b85280968d41a1b75bd1fcf6833aad31f99418fd92994e07",
  "c4591f4dc9f5c67095cc064a3fce8f841165e56cad51f6517bf745deec61adfa",
  "c12e6b469f07711539ef7120a8883cccb404443e9b31ca0cd23976752030d95c",
  "bd1bd6f5d16029d93b9f4823d042f64b280a7467f5f52a12db8e66114f595b62",
  "37477c4dc01a6cc9687d91139ff079d029b78c150a1639d5455044d7df162f4f",
  "e2f3438df6a2791f2fa3460c3d1c081b80be5217632eadbfc05cf8c669315aec",
  "cb3233a1052a960d63a441a4d0bff95dff04944260d04d8b19affd7613d17b22",
  "8ddf540a23086c3f6130e00168d47426a11f43b5b2c3b3e9ec651a167b13bb99",
  "cfb7473d327273c27f26a32dd1258592391e18b3263c4ac19d982d5e022d896b",
  "25fda34cff27cc8b3edce71cd8bd26973ff151637d99636f3441858e33e41803",
  "152b5b1b372413d89c8a492eb8e21793618e9f317b86b5761468acebcded272f",
  "a54b3e48fa161385a4392f2cb75da03c59b45f48c3742f7a9948ebdb27421901",
  "dd3666cabe715b684a0df2b6b60091d118910b02b16cf9586932bc373ddde3bb",
  "16de44529a92f489b97fb98cdf48e3aa9f230e5f3999020104599d48f607284f",
] as const;

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

type UploadFileEntry = {
  filename: string;
  chunkIndex: number;
  totalChunks: number;
  objects: number;
  firstKey: string;
  lastKey: string;
  uploadedAt: string;
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
      detected_domain: typeof o.detected_domain === "string" ? o.detected_domain : typeof o.domain === "string" ? o.domain : null,
      detected_topic: typeof o.detected_topic === "string" ? o.detected_topic : typeof o.topic === "string" ? o.topic : null,
      proposed_difficulty: typeof o.proposed_difficulty === "number" ? o.proposed_difficulty : typeof o.difficulty === "number" ? o.difficulty : null,
      raw_content: (o.raw_content || o) as Record<string, unknown>,
    }));
  }
  throw new Error("Payload must be a staging array or a normalized manifest with an objects array.");
}

function createSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function logicalChunkSignature(rows: StagingRow[]) {
  const pairs = rows.map((r) => [String(r.source_record_key || ""), String(r.content_hash || "")]);
  return createHash("sha256").update(JSON.stringify(pairs), "utf8").digest("hex");
}

async function readBatchStatus(supabase: ReturnType<typeof createClient>) {
  const { data: batch, error } = await supabase
    .from("cf_import_batches")
    .select("id,batch_name,status,metadata")
    .eq("batch_name", TARGET_BATCH)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Batch read failed: ${error.message}`);

  if (!batch) {
    return {
      batch: null,
      stagedCount: 0,
      uploadedFiles: [] as UploadFileEntry[],
      metadata: {} as Record<string, unknown>,
    };
  }

  const { count, error: countError } = await supabase
    .from("cf_content_staging")
    .select("id", { count: "exact", head: true })
    .eq("import_batch_id", batch.id);
  if (countError) throw new Error(`Staging count failed: ${countError.message}`);

  const metadata = (batch.metadata || {}) as Record<string, any>;
  const uploadedFiles = Array.isArray(metadata.uploaded_files) ? metadata.uploaded_files as UploadFileEntry[] : [];
  return { batch, stagedCount: count || 0, uploadedFiles, metadata };
}

export async function GET(request: Request) {
  const supabase = createSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase server configuration is incomplete." }, { status: 503 });

  try {
    const url = new URL(request.url);
    const requestedBatch = String(url.searchParams.get("batchName") || TARGET_BATCH).trim();
    if (requestedBatch !== TARGET_BATCH) {
      return NextResponse.json({ ok: false, error: "This direct uploader only exposes the Capital Forge V2 import batch." }, { status: 403 });
    }

    const state = await readBatchStatus(supabase);
    return NextResponse.json({
      ok: true,
      exists: Boolean(state.batch),
      batchName: TARGET_BATCH,
      batchId: state.batch?.id || null,
      status: state.batch?.status || "not-created",
      stagedObjectsInBatch: state.stagedCount,
      expectedTotal: EXPECTED_TOTAL,
      expectedObjectCount: EXPECTED_TOTAL,
      totalChunks: EXPECTED_CHUNKS,
      uploadedFiles: state.uploadedFiles,
      uploadedFileCount: state.uploadedFiles.length,
      complete: state.stagedCount === EXPECTED_TOTAL,
      published: 0,
      note: "Direct V2 batch status. No admin secret required.",
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = createSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase server configuration is incomplete." }, { status: 503 });

  try {
    const body = await request.json();
    const batchName = String(body?.batchName || "").trim();
    if (batchName !== TARGET_BATCH) {
      return NextResponse.json({ ok: false, error: `Direct upload is restricted to batch ${TARGET_BATCH}.` }, { status: 403 });
    }

    const rows = normalizeInput(body?.payload ?? body);
    const objectCount = rows.length;
    const expectedTotal = Number(body?.expectedTotal ?? EXPECTED_TOTAL);
    const chunkIndex = Number(body?.chunkIndex ?? -1);
    const totalChunks = Number(body?.totalChunks ?? EXPECTED_CHUNKS);
    const originalFilename = typeof body?.filename === "string" && body.filename.trim() ? body.filename.trim() : `capital_forge_v2_chunk_${chunkIndex + 1}.json`;

    if (expectedTotal !== EXPECTED_TOTAL || totalChunks !== EXPECTED_CHUNKS) {
      return NextResponse.json({ ok: false, error: `This one-time uploader requires exactly ${EXPECTED_TOTAL} objects across ${EXPECTED_CHUNKS} chunks.` }, { status: 400 });
    }
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= EXPECTED_CHUNKS) {
      return NextResponse.json({ ok: false, error: "Invalid V2 chunk index." }, { status: 400 });
    }
    if (objectCount !== EXPECTED_CHUNK_SIZE) {
      return NextResponse.json({ ok: false, error: `V2 chunk ${chunkIndex + 1} must contain exactly ${EXPECTED_CHUNK_SIZE} objects; received ${objectCount}.` }, { status: 400 });
    }

    const keys = rows.map((r) => String(r.source_record_key || "").trim());
    if (keys.some((k) => !/^CF2-[A-Z]+-\d{4}$/.test(k)) || new Set(keys).size !== objectCount) {
      return NextResponse.json({ ok: false, error: "Every row must have one unique CF2 source_record_key." }, { status: 400 });
    }
    if (rows.some((r) => r.source_model !== SOURCE_MODEL)) {
      return NextResponse.json({ ok: false, error: `Only source_model=${SOURCE_MODEL} is accepted by this direct uploader.` }, { status: 400 });
    }
    if (rows.some((r) => !r.content_hash || !r.content_type || !r.raw_content || typeof r.raw_content !== "object")) {
      return NextResponse.json({ ok: false, error: "Each V2 row must contain content_hash, content_type and raw_content." }, { status: 400 });
    }

    const signature = logicalChunkSignature(rows);
    if (signature !== EXPECTED_CHUNK_SIGNATURES[chunkIndex]) {
      return NextResponse.json({ ok: false, error: `Chunk ${chunkIndex + 1} does not match the approved Capital Forge V2 payload. Select the correct split file.` }, { status: 403 });
    }

    let state = await readBatchStatus(supabase);
    if (state.stagedCount === EXPECTED_TOTAL) {
      return NextResponse.json({
        ok: true,
        complete: true,
        batchName: TARGET_BATCH,
        batchId: state.batch?.id,
        sourceObjects: EXPECTED_TOTAL,
        chunkObjects: objectCount,
        chunkIndex,
        totalChunks: EXPECTED_CHUNKS,
        existingKeysSkipped: objectCount,
        inserted: 0,
        stagedObjectsInBatch: EXPECTED_TOTAL,
        uploadedFiles: state.uploadedFiles,
        uploadedFileCount: state.uploadedFiles.length,
        validationCalled: false,
        validationMessage: "Batch already complete; no write performed.",
        published: 0,
        note: "All 2,000 objects are already staged.",
      });
    }

    const domainTopicPairs = new Map<string, { domain: string; topic: string }>();
    for (const row of rows) {
      const domain = row.detected_domain || String(row.raw_content?.domain || "");
      const topic = row.detected_topic || String(row.raw_content?.topic || "");
      if (!domain || !topic) {
        return NextResponse.json({ ok: false, error: `Missing domain/topic on ${row.source_record_key}.` }, { status: 400 });
      }
      domainTopicPairs.set(`${domain}|||${topic}`, { domain, topic });
    }

    const domainNames = [...new Set([...domainTopicPairs.values()].map((x) => x.domain))].sort();
    const domainRows = domainNames.map((name, idx) => ({
      slug: slugify(name),
      name,
      description: `Capital Forge normalized content domain: ${name}.`,
      sort_order: 100 + idx * 10,
      active: true,
    }));

    const { error: domainUpsertError } = await supabase.from("cf_domains").upsert(domainRows, { onConflict: "slug", ignoreDuplicates: true });
    if (domainUpsertError) throw new Error(`Domain upsert failed: ${domainUpsertError.message}`);

    const { data: domainData, error: domainReadError } = await supabase
      .from("cf_domains")
      .select("id,slug,name")
      .in("slug", domainRows.map((d) => d.slug));
    if (domainReadError) throw new Error(`Domain read failed: ${domainReadError.message}`);

    const domainIdBySlug = new Map((domainData || []).map((d) => [d.slug, d.id]));
    if (domainIdBySlug.size !== domainRows.length) throw new Error(`Expected ${domainRows.length} domains; resolved ${domainIdBySlug.size}.`);

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
      const { error } = await supabase.from("cf_topics").upsert(part, { onConflict: "domain_id,slug", ignoreDuplicates: true });
      if (error) throw new Error(`Topic upsert failed: ${error.message}`);
    }

    let batch = state.batch;
    if (!batch) {
      const { data, error } = await supabase
        .from("cf_import_batches")
        .insert({
          batch_name: TARGET_BATCH,
          source_type: "json",
          source_model: SOURCE_MODEL,
          original_filename: originalFilename,
          status: "staging",
          metadata: {
            source: "Capital Forge one-time direct V2 importer",
            expected_object_count: EXPECTED_TOTAL,
            total_chunks: EXPECTED_CHUNKS,
            uploaded_files: [],
            parser_contract: "capital-forge-direct-v2-exact-chunk-signatures",
          },
        })
        .select("id,batch_name,status,metadata")
        .single();
      if (error) throw new Error(`Import batch creation failed: ${error.message}`);
      batch = data;
      state = { ...state, batch, metadata: (data.metadata || {}) as Record<string, unknown> };
    }

    const existingInBatch = new Set<string>();
    const conflictingKeys: string[] = [];
    for (const part of chunk(keys, 100)) {
      const { data, error } = await supabase
        .from("cf_content_staging")
        .select("source_record_key,import_batch_id")
        .in("source_record_key", part);
      if (error) throw new Error(`Existing-key lookup failed: ${error.message}`);
      for (const row of data || []) {
        if (row.import_batch_id === batch.id) existingInBatch.add(row.source_record_key);
        else conflictingKeys.push(row.source_record_key);
      }
    }
    if (conflictingKeys.length) {
      return NextResponse.json({ ok: false, error: `${conflictingKeys.length} CF2 key(s) already exist in another staging batch; refusing ambiguous lineage.` }, { status: 409 });
    }

    const newRows = rows
      .filter((r) => !existingInBatch.has(r.source_record_key))
      .map((r) => ({
        import_batch_id: batch!.id,
        source_type: r.source_type || "jsonl",
        source_model: SOURCE_MODEL,
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

    const previousEntries = Array.isArray((state.metadata as any)?.uploaded_files) ? (state.metadata as any).uploaded_files as UploadFileEntry[] : [];
    const entry: UploadFileEntry = {
      filename: originalFilename,
      chunkIndex,
      totalChunks: EXPECTED_CHUNKS,
      objects: objectCount,
      firstKey: keys[0],
      lastKey: keys[keys.length - 1],
      uploadedAt: new Date().toISOString(),
    };
    const mergedEntries = [...previousEntries.filter((x) => x.chunkIndex !== chunkIndex), entry].sort((a, b) => a.chunkIndex - b.chunkIndex);
    const nextMetadata = {
      ...(state.metadata || {}),
      source: "Capital Forge one-time direct V2 importer",
      expected_object_count: EXPECTED_TOTAL,
      total_chunks: EXPECTED_CHUNKS,
      uploaded_files: mergedEntries,
      parser_contract: "capital-forge-direct-v2-exact-chunk-signatures",
    };
    const { error: metadataError } = await supabase.from("cf_import_batches").update({ metadata: nextMetadata }).eq("id", batch.id);
    if (metadataError) throw new Error(`Batch tracker update failed: ${metadataError.message}`);

    const refreshed = await readBatchStatus(supabase);
    const complete = refreshed.stagedCount === EXPECTED_TOTAL;
    await supabase.from("cf_import_batches").update({ status: complete ? "staged" : "staging" }).eq("id", batch.id);

    let validationCalled = false;
    let validationMessage = complete ? "Not yet validated" : "Deferred until all 2,000 objects are staged.";
    let statusSummary: Record<string, number> | undefined;

    if (complete) {
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
        validationMessage = message;
        const mismatch = /function .* does not exist|Could not find the function|schema cache|parameter/i.test(message);
        if (!mismatch) break;
      }

      const { data: stagedRows, error: summaryError } = await supabase
        .from("cf_content_staging")
        .select("content_type,validation_status,source_record_key")
        .eq("import_batch_id", batch.id);
      if (summaryError) throw new Error(`Import summary read failed: ${summaryError.message}`);
      statusSummary = {};
      for (const row of stagedRows || []) {
        const key = `${row.content_type} / ${row.validation_status}`;
        statusSummary[key] = (statusSummary[key] || 0) + 1;
      }
    }

    return NextResponse.json({
      ok: true,
      complete,
      batchName: TARGET_BATCH,
      batchId: batch.id,
      sourceObjects: EXPECTED_TOTAL,
      chunkObjects: objectCount,
      chunkIndex,
      totalChunks: EXPECTED_CHUNKS,
      existingKeysSkipped: existingInBatch.size,
      inserted: newRows.length,
      stagedObjectsInBatch: refreshed.stagedCount,
      expectedObjectCount: EXPECTED_TOTAL,
      uploadedFiles: refreshed.uploadedFiles,
      uploadedFileCount: refreshed.uploadedFiles.length,
      validationCalled,
      validationMessage,
      statusSummary,
      published: 0,
      note: complete
        ? "All 2,000 approved V2 objects are staged. Nothing was automatically published."
        : "Approved V2 chunk staged. Continue with the remaining split files; nothing is published.",
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
