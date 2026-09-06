import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { brotliDecompressSync } from "node:zlib";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const TOKEN_SHA256 = "865f68fb7d5d25f4b3c5550e6f78238fbb2e919e3922b09ffab950a1c96d64bf";
const TECH = new Set(["FOR","ACC","VAL","MA","LBO","CFI","DER","VC","RISK","XL"]);
const HISTORY = new Set(["HMN","CNM","CBG","HCM"]);
const TRADES = new Set(["LIT","HFT","IBD","HED","BLW"]);
const CRISES = new Set(["CRS","BUB","COL","SOV"]);
const FACTS = new Set(["GK","ORI"]);

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function slugify(v: unknown) { return String(v || "").trim().toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function str(v: unknown) { return typeof v === "string" ? v.trim() : ""; }
function arr(v: unknown) { return Array.isArray(v) ? v : []; }
function universe(code: string) {
  if (TECH.has(code)) return "Technicals";
  if (HISTORY.has(code)) return "Market History";
  if (TRADES.has(code)) return "Legendary Trades & Deals";
  if (CRISES.has(code)) return "Crises & Events";
  if (FACTS.has(code)) return "Finance Facts";
  return "";
}
function sourceKind(v: unknown) {
  const s = str(v);
  if (s === "primary_source" || s === "secondary_source" || s === "source_grounded") return "source_grounded";
  if (s === "authored_synthetic" || s === "authored") return "authored";
  return "";
}
function normalize(raw: any) {
  const code = str(raw.category_code);
  const category = str(raw.category);
  const uv = str(raw.unique_or_variant) || (raw.variant_of || raw.variant_family_id ? "variant" : "unique");
  return {
    source_record_key: str(raw.source_record_key),
    title: str(raw.title || raw.question),
    universe: universe(code),
    category,
    category_slug: slugify(category),
    topic: str(raw.topic) || null,
    subtopic: str(raw.subtopic) || null,
    difficulty: Number(raw.difficulty || 5),
    content_type: str(raw.content_type) || "question",
    question_type: str(raw.question_type) || null,
    prompt: str(raw.question || raw.prompt) || null,
    answer: raw.correct_answer == null ? (str(raw.model_answer) || null) : String(raw.correct_answer),
    explanation: str(raw.solution || raw.model_answer || raw.context) || null,
    intuition: str(raw.intuition) || null,
    common_mistake: str(raw.common_mistake || raw.trap) || null,
    why_it_matters: str(raw.why_it_matters) || null,
    pattern_to_remember: str(raw.key_principle) || null,
    estimated_time_seconds: Number.isFinite(Number(raw.estimated_time_seconds)) ? Number(raw.estimated_time_seconds) : null,
    source_kind: sourceKind(raw.source_kind),
    source_ids: [],
    source_metadata: { sources: arr(raw.sources), source_fact_or_section_used: str(raw.source_fact_or_section_used), source_kind_original: str(raw.source_kind) },
    content: raw,
    tags: arr(raw.tags).map(String),
    entities: {},
    event_date: null,
    unique_or_variant: uv,
    variant_of: str(raw.variant_of) || null,
    variant_family_id: str(raw.variant_family_id) || null,
    variant_number: Number.isFinite(Number(raw.variant_number)) ? Number(raw.variant_number) : null,
    repetition_type: str(raw.repetition_type) || null,
    quality_score: Number.isFinite(Number(raw.quality_score)) ? Number(raw.quality_score) : null,
    validation_status: str(raw.calculation_validation_status) === "passed" ? "calculation_validated" : "canonical",
    status: "published"
  };
}
function summarize(rows: any[]) {
  const cats: Record<string,number> = {};
  for (const r of rows) cats[r.category] = (cats[r.category] || 0) + 1;
  const summary = {
    total: rows.length,
    categories: Object.keys(cats).length,
    badCategoryCounts: Object.entries(cats).filter(([,n])=>n!==120),
    unique: rows.filter(r=>r.unique_or_variant==="unique").length,
    variants: rows.filter(r=>r.unique_or_variant==="variant").length,
    sourceGrounded: rows.filter(r=>r.source_kind==="source_grounded").length,
    authored: rows.filter(r=>r.source_kind==="authored").length,
    brokenVariantLineage: rows.filter(r=>r.unique_or_variant==="variant" && !r.variant_of && !r.variant_family_id).length
  };
  const ready = summary.total===3000 && summary.categories===25 && summary.badCategoryCounts.length===0 && summary.unique===2400 && summary.variants===600 && summary.sourceGrounded===1800 && summary.authored===1200 && summary.brokenVariantLineage===0;
  return {summary,ready};
}
async function authorized(req: Request) {
  const token = req.headers.get("x-cf3-import-token") || "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,"0")).join("");
  return hex === TOKEN_SHA256;
}

export async function POST(req: Request) {
  if (!(await authorized(req))) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });
  const db = admin();
  if (!db) return NextResponse.json({ ok:false, error:"Supabase admin unavailable" }, { status:503 });
  const body = await req.json();
  const action = String(body?.action || "batch");

  if (action === "reset") {
    const { error } = await db.from("knowledge_objects").delete().like("source_record_key", "CF3-%");
    if (error) return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json({ok:true,reset:true});
  }

  if (action === "batch") {
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length || items.length > 50) return NextResponse.json({ok:false,error:"batch must contain 1-50 items"},{status:400});
    const rows = items.map(normalize);
    const invalid = rows.filter((r:any) => !r.source_record_key || !r.title || !r.universe || !r.category || !["source_grounded","authored"].includes(r.source_kind) || !["unique","variant"].includes(r.unique_or_variant) || r.difficulty < 1 || r.difficulty > 10);
    if (invalid.length) return NextResponse.json({ok:false,error:"normalization validation failed",keys:invalid.slice(0,10).map((x:any)=>x.source_record_key)},{status:400});
    const { error } = await db.from("knowledge_objects").upsert(rows,{onConflict:"source_record_key"});
    if (error) return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json({ok:true,imported:rows.length,first:rows[0].source_record_key,last:rows[rows.length-1].source_record_key});
  }

  if (action === "from_staging") {
    const { data: chunks, error: chunkError } = await db.from("cf3_import_chunks").select("seq,payload").order("seq", { ascending:true }).limit(1000);
    if (chunkError) return NextResponse.json({ok:false,error:chunkError.message},{status:500});
    const b64 = (chunks || []).map((x:any)=>x.payload).join("");
    if (!b64) return NextResponse.json({ok:false,error:"no staged CF3 payload"},{status:400});
    let text = "";
    try { text = brotliDecompressSync(Buffer.from(b64,"base64")).toString("utf8"); }
    catch (e:any) { return NextResponse.json({ok:false,error:`brotli decode failed: ${e.message}`},{status:400}); }
    const rawRows = text.split(/\r?\n/).filter(Boolean).map((line:string)=>JSON.parse(line));
    const rows = rawRows.map(normalize);
    const invalid = rows.filter((r:any) => !r.source_record_key || !r.title || !r.universe || !r.category || !["source_grounded","authored"].includes(r.source_kind) || !["unique","variant"].includes(r.unique_or_variant) || r.difficulty < 1 || r.difficulty > 10);
    const pre = summarize(rows);
    if (invalid.length || !pre.ready) return NextResponse.json({ok:false,error:"pre-import reconciliation failed",invalid:invalid.slice(0,10).map((x:any)=>x.source_record_key),...pre},{status:400});
    const keys = new Set(rows.map((r:any)=>r.source_record_key));
    if (keys.size !== 3000) return NextResponse.json({ok:false,error:"duplicate source_record_key in staged payload",uniqueKeys:keys.size},{status:400});
    const { error: delError } = await db.from("knowledge_objects").delete().like("source_record_key","CF3-%");
    if (delError) return NextResponse.json({ok:false,error:delError.message},{status:500});
    for (let i=0;i<rows.length;i+=100) {
      const { error } = await db.from("knowledge_objects").upsert(rows.slice(i,i+100),{onConflict:"source_record_key"});
      if (error) return NextResponse.json({ok:false,error:error.message,failedAt:i},{status:500});
    }
    const { data: check, error: checkError } = await db.from("knowledge_objects").select("source_record_key,category,universe,unique_or_variant,source_kind,variant_of,variant_family_id,status").eq("status","published").like("source_record_key","CF3-%").limit(4000);
    if (checkError) return NextResponse.json({ok:false,error:checkError.message},{status:500});
    const post = summarize(check || []);
    if (!post.ready) return NextResponse.json({ok:false,error:"post-import reconciliation failed",...post},{status:500});
    return NextResponse.json({ok:true,ready:true,stagedChunks:(chunks||[]).length,compressedChars:b64.length,decodedBytes:Buffer.byteLength(text),...post});
  }

  if (action === "status" || action === "finalize") {
    const { data, error } = await db.from("knowledge_objects").select("source_record_key,category,universe,unique_or_variant,source_kind,variant_of,variant_family_id,status").eq("status","published").like("source_record_key","CF3-%").limit(4000);
    if (error) return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json({ok:true,...summarize(data || [])});
  }
  return NextResponse.json({ok:false,error:"unknown action"},{status:400});
}
