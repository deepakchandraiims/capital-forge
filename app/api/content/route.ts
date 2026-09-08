import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

type ContentType = "all" | "practice" | "concepts" | "cases" | "interview";
type Taxonomy = { topic_name?: string | null; topic_slug?: string | null; domain_name?: string | null; domain_slug?: string | null };
type CacheEntry = { expiresAt: number; value: Record<string, unknown> };

const MEMORY_TTL_MS = 10 * 60 * 1000;
const TAXONOMY_TTL_MS = 60 * 60 * 1000;
const responseCache = new Map<string, CacheEntry>();
let taxonomyCache: { expiresAt: number; value: Map<string, Taxonomy> } | null = null;

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400",
  "CDN-Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
  "Vercel-CDN-Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400"
};

function normalizeType(value: string | null): ContentType {
  if (value === "practice" || value === "concepts" || value === "cases" || value === "interview") return value;
  return "all";
}

function cached(key: string) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return entry.value;
}

function remember(key: string, value: Record<string, unknown>) {
  responseCache.set(key, { value, expiresAt: Date.now() + MEMORY_TTL_MS });
  if (responseCache.size > 100) {
    const oldest = responseCache.keys().next().value as string | undefined;
    if (oldest) responseCache.delete(oldest);
  }
}

async function getTaxonomy(supabase: any) {
  if (taxonomyCache && taxonomyCache.expiresAt > Date.now()) return taxonomyCache.value;
  const [{ data: topics, error: topicError }, { data: domains, error: domainError }] = await Promise.all([
    supabase.from("cf_topics").select("id,name,slug,domain_id"),
    supabase.from("cf_domains").select("id,name,slug")
  ]);
  if (topicError) throw topicError;
  if (domainError) throw domainError;
  const domainById = new Map((domains || []).map((d: any) => [d.id, d]));
  const map = new Map<string, Taxonomy>();
  for (const topic of topics || []) {
    const domain: any = domainById.get((topic as any).domain_id);
    map.set((topic as any).id, {
      topic_name: (topic as any).name || null,
      topic_slug: (topic as any).slug || null,
      domain_name: domain?.name || null,
      domain_slug: domain?.slug || null
    });
  }
  taxonomyCache = { value: map, expiresAt: Date.now() + TAXONOMY_TTL_MS };
  return map;
}

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bearer = request.headers.get("authorization");
  if (!url || (!serviceRoleKey && !publishableKey)) return NextResponse.json({ ok: false, error: "Supabase is not configured for the content API." }, { status: 503 });
  if (!serviceRoleKey && !bearer) return NextResponse.json({ ok: false, error: "Published content is protected by RLS. Configure SUPABASE_SERVICE_ROLE_KEY or send an authenticated bearer token." }, { status: 503 });

  const clientKey = serviceRoleKey || publishableKey!;
  const authorization = serviceRoleKey ? `Bearer ${serviceRoleKey}` : bearer!;
  const supabase = createClient(url, clientKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authorization } }
  });

  const requestUrl = new URL(request.url);
  const type = normalizeType(requestUrl.searchParams.get("type"));
  const view = requestUrl.searchParams.get("view") === "summary" ? "summary" : "full";
  const detailId = String(requestUrl.searchParams.get("id") || "").trim();
  const cacheKey = detailId ? `detail:${type}:${detailId}` : `catalog:${type}:${view}`;
  const hit = cached(cacheKey);
  if (hit) return NextResponse.json(hit, { headers: { ...CACHE_HEADERS, "X-Capital-Forge-Cache": "memory-hit" } });

  const limit = 5000;
  const PAGE_SIZE = 1000;
  let taxonomyByTopic: Map<string, Taxonomy>;
  try {
    taxonomyByTopic = await getTaxonomy(supabase);
  } catch (error) {
    return NextResponse.json({ ok: false, stage: "taxonomy", error: error instanceof Error ? error.message : "Could not load taxonomy." }, { status: 500 });
  }
  const enrich = (rows: any[]) => rows.map((row: any) => ({ ...row, ...(row.topic_id ? (taxonomyByTopic.get(row.topic_id) || {}) : {}) }));

  const QUESTION_FIELDS = "id,domain_id,topic_id,question_type,question,difficulty,career_tracks,seniority,expected_time_seconds,options,correct_answer,short_answer,model_answer,expected_points,rubric,calculation_required,quality_score,status,source_record_key,origin_content_type,source_ids";
  const QUESTION_SUMMARY_FIELDS = "id,domain_id,topic_id,question_type,question,difficulty,career_tracks,seniority,expected_time_seconds,calculation_required,quality_score,status,source_record_key,origin_content_type";
  const CASE_FIELDS = "id,domain_id,topic_id,title,case_type,industry,difficulty,scenario,facts,financial_data,questions,solution,rubric,source_ids,source_model,quality_score,status,source_record_key,origin_content_type";

  if (detailId && (type === "practice" || type === "interview")) {
    const { data, error } = await supabase.from("cf_questions").select(QUESTION_FIELDS).eq("id", detailId).eq("status", "published").maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: "Question not found." }, { status: 404 });
    const question: any = enrich([data])[0];
    const isInterview = question.origin_content_type === "interview_question";
    if ((type === "practice" && isInterview) || (type === "interview" && !isInterview)) return NextResponse.json({ ok: false, error: "Question not found in this catalog." }, { status: 404 });
    const result = { ok: true, source: "supabase-canonical", generatedAt: new Date().toISOString(), question };
    remember(cacheKey, result);
    return NextResponse.json(result, { headers: CACHE_HEADERS });
  }

  async function fetchPublished(table: "cf_concepts" | "cf_questions" | "cf_cases", fieldsOverride?: string) {
    const fields = fieldsOverride || (table === "cf_questions" ? QUESTION_FIELDS : table === "cf_cases" ? CASE_FIELDS : "*");
    const first = await supabase.from(table).select(fields).eq("status", "published").order("source_record_key", { ascending: true }).range(0, PAGE_SIZE - 1);
    if (first.error) return { rows: first.data || [], error: first.error };
    const rows: any[] = [...(first.data || [])];
    if (rows.length < PAGE_SIZE) return { rows, error: null };

    // Fetch the remaining pages concurrently. The old implementation waited for
    // every 1,000-row page serially, multiplying cross-region latency.
    const remainingStarts: number[] = [];
    for (let from = PAGE_SIZE; from < limit; from += PAGE_SIZE) remainingStarts.push(from);
    const pages = await Promise.all(remainingStarts.map((from) =>
      supabase.from(table).select(fields).eq("status", "published").order("source_record_key", { ascending: true }).range(from, Math.min(from + PAGE_SIZE - 1, limit - 1))
    ));
    for (const page of pages) {
      if (page.error) return { rows, error: page.error };
      rows.push(...(page.data || []));
    }
    return { rows: rows.slice(0, limit), error: null };
  }

  const result: Record<string, unknown> = {
    ok: true,
    source: "supabase-canonical",
    catalog: "Capital Forge Canonical Content OS",
    catalogs: ["CF-DCF-PILOT-001", "CF-FULL-EXPORT-20260905-001", "CF-V2-2000-20260905-001"],
    generatedAt: new Date().toISOString(),
    view
  };

  if (type === "all" || type === "concepts") {
    const { rows, error } = await fetchPublished("cf_concepts");
    if (error) return NextResponse.json({ ok: false, stage: "concepts", error: error.message }, { status: 500 });
    result.concepts = enrich(rows);
  }

  if (type === "all" || type === "practice" || type === "interview") {
    const { rows, error } = await fetchPublished("cf_questions", view === "summary" ? QUESTION_SUMMARY_FIELDS : QUESTION_FIELDS);
    if (error) return NextResponse.json({ ok: false, stage: "questions", error: error.message }, { status: 500 });
    const allQuestions = enrich(rows);
    const interview = allQuestions.filter((row: any) => row.origin_content_type === "interview_question");
    const practice = allQuestions.filter((row: any) => row.origin_content_type !== "interview_question");
    if (type === "all" || type === "practice") result.practice = practice;
    if (type === "all" || type === "interview") result.interview = interview;
  }

  if (type === "all" || type === "cases") {
    const { rows, error } = await fetchPublished("cf_cases");
    if (error) return NextResponse.json({ ok: false, stage: "cases", error: error.message }, { status: 500 });
    result.cases = enrich(rows);
  }

  const counts: Record<string, number> = {};
  if (Array.isArray(result.concepts)) counts.concepts = result.concepts.length;
  if (Array.isArray(result.practice)) counts.practice = result.practice.length;
  if (Array.isArray(result.cases)) counts.cases = result.cases.length;
  if (Array.isArray(result.interview)) counts.interview = result.interview.length;
  result.counts = counts;
  result.totalReturned = Object.values(counts).reduce((sum, n) => sum + n, 0);

  remember(cacheKey, result);
  return NextResponse.json(result, { headers: { ...CACHE_HEADERS, "X-Capital-Forge-Cache": "memory-miss" } });
}
