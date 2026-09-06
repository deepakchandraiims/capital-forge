import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type ContentType = "all" | "practice" | "concepts" | "cases" | "interview";

type Taxonomy = {
  topic_name?: string | null;
  topic_slug?: string | null;
  domain_name?: string | null;
  domain_slug?: string | null;
};

function normalizeType(value: string | null): ContentType {
  if (value === "practice" || value === "concepts" || value === "cases" || value === "interview") return value;
  return "all";
}

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bearer = request.headers.get("authorization");

  if (!url || (!serviceRoleKey && !publishableKey)) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured for the content API." }, { status: 503 });
  }
  if (!serviceRoleKey && !bearer) {
    return NextResponse.json({ ok: false, error: "Published content is protected by RLS. Configure SUPABASE_SERVICE_ROLE_KEY or send an authenticated bearer token." }, { status: 503 });
  }

  const clientKey = serviceRoleKey || publishableKey!;
  const authorization = serviceRoleKey ? `Bearer ${serviceRoleKey}` : bearer!;
  const supabase = createClient(url, clientKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authorization } }
  });

  const requestUrl = new URL(request.url);
  const type = normalizeType(requestUrl.searchParams.get("type"));

  // Legacy clients still send limit=1000. Capital Forge now contains >2,000
  // canonical questions, so the API intentionally returns the complete catalog
  // and paginates internally through Supabase/PostgREST's 1,000-row window.
  const limit = 5000;
  const PAGE_SIZE = 1000;

  const [{ data: topics }, { data: domains }] = await Promise.all([
    supabase.from("cf_topics").select("id,name,slug,domain_id"),
    supabase.from("cf_domains").select("id,name,slug")
  ]);

  const domainById = new Map((domains || []).map((d: any) => [d.id, d]));
  const taxonomyByTopic = new Map<string, Taxonomy>();
  for (const topic of topics || []) {
    const domain: any = domainById.get((topic as any).domain_id);
    taxonomyByTopic.set((topic as any).id, {
      topic_name: (topic as any).name || null,
      topic_slug: (topic as any).slug || null,
      domain_name: domain?.name || null,
      domain_slug: domain?.slug || null
    });
  }

  const enrich = (rows: any[]) => rows.map((row: any) => ({
    ...row,
    ...(row.topic_id ? (taxonomyByTopic.get(row.topic_id) || {}) : {})
  }));

  const QUESTION_FIELDS = "id,domain_id,topic_id,question_type,question,difficulty,career_tracks,seniority,expected_time_seconds,options,correct_answer,short_answer,model_answer,expected_points,rubric,calculation_required,quality_score,status,source_record_key,origin_content_type,source_ids";
  const CASE_FIELDS = "id,domain_id,topic_id,title,case_type,industry,difficulty,scenario,facts,financial_data,questions,solution,rubric,source_ids,source_model,quality_score,status,source_record_key,origin_content_type";

  async function fetchPublished(table: "cf_concepts" | "cf_questions" | "cf_cases") {
    const rows: any[] = [];
    const fields = table === "cf_questions" ? QUESTION_FIELDS : table === "cf_cases" ? CASE_FIELDS : "*";
    for (let from = 0; from < limit; from += PAGE_SIZE) {
      const pageLength = Math.min(PAGE_SIZE, limit - from);
      const to = from + pageLength - 1;
      const { data, error } = await supabase
        .from(table)
        .select(fields)
        .eq("status", "published")
        .order("source_record_key", { ascending: true })
        .range(from, to);
      if (error) return { rows, error };
      const page = data || [];
      rows.push(...page);
      if (page.length < pageLength) break;
    }
    return { rows, error: null };
  }

  const result: Record<string, unknown> = {
    ok: true,
    source: "supabase-canonical",
    catalog: "Capital Forge Canonical Content OS",
    catalogs: ["CF-DCF-PILOT-001", "CF-FULL-EXPORT-20260905-001", "CF-V2-2000-20260905-001"],
    generatedAt: new Date().toISOString()
  };

  if (type === "all" || type === "concepts") {
    const { rows, error } = await fetchPublished("cf_concepts");
    if (error) return NextResponse.json({ ok: false, stage: "concepts", error: error.message }, { status: 500 });
    result.concepts = enrich(rows);
  }

  if (type === "all" || type === "practice" || type === "interview") {
    const { rows, error } = await fetchPublished("cf_questions");
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

  return NextResponse.json(result);
}
