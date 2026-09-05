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
  const limitParam = Number(requestUrl.searchParams.get("limit") || "1000");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 1000) : 1000;

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

  const result: Record<string, unknown> = {
    ok: true,
    source: "supabase-canonical",
    catalog: "Capital Forge Canonical Content OS",
    catalogs: ["CF-DCF-PILOT-001", "CF-FULL-EXPORT-20260905-001"],
    generatedAt: new Date().toISOString()
  };

  if (type === "all" || type === "concepts") {
    const { data, error } = await supabase.from("cf_concepts").select("*").eq("status", "published").order("source_record_key", { ascending: true }).limit(limit);
    if (error) return NextResponse.json({ ok: false, stage: "concepts", error: error.message }, { status: 500 });
    result.concepts = enrich(data || []);
  }

  if (type === "all" || type === "practice" || type === "interview") {
    const { data, error } = await supabase.from("cf_questions").select("*").eq("status", "published").order("source_record_key", { ascending: true }).limit(limit);
    if (error) return NextResponse.json({ ok: false, stage: "questions", error: error.message }, { status: 500 });
    const allQuestions = enrich(data || []);
    const interview = allQuestions.filter((row: any) => row.origin_content_type === "interview_question");
    const practice = allQuestions.filter((row: any) => row.origin_content_type !== "interview_question");
    if (type === "all" || type === "practice") result.practice = practice;
    if (type === "all" || type === "interview") result.interview = interview;
  }

  if (type === "all" || type === "cases") {
    const { data, error } = await supabase.from("cf_cases").select("*").eq("status", "published").order("source_record_key", { ascending: true }).limit(limit);
    if (error) return NextResponse.json({ ok: false, stage: "cases", error: error.message }, { status: 500 });
    result.cases = enrich(data || []);
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
