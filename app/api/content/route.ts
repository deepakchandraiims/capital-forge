import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type ContentType = "all" | "practice" | "concepts" | "cases" | "interview";

function normalizeType(value: string | null): ContentType {
  if (value === "practice" || value === "concepts" || value === "cases" || value === "interview") {
    return value;
  }
  return "all";
}

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bearer = request.headers.get("authorization");

  if (!url || (!serviceRoleKey && !publishableKey)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase is not configured for the content API.",
        requires: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
      },
      { status: 503 }
    );
  }

  if (!serviceRoleKey && !bearer) {
    return NextResponse.json(
      {
        ok: false,
        error: "Published content is protected by RLS. Configure SUPABASE_SERVICE_ROLE_KEY in Vercel or send an authenticated bearer token.",
        requires: ["SUPABASE_SERVICE_ROLE_KEY"]
      },
      { status: 503 }
    );
  }

  const clientKey = serviceRoleKey || publishableKey!;
  const authorization = serviceRoleKey ? `Bearer ${serviceRoleKey}` : bearer!;

  const supabase = createClient(url, clientKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: authorization
      }
    }
  });

  const requestUrl = new URL(request.url);
  const type = normalizeType(requestUrl.searchParams.get("type"));
  const limitParam = Number(requestUrl.searchParams.get("limit") || "100");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 250) : 100;

  const result: Record<string, unknown> = {
    ok: true,
    source: "supabase-canonical",
    pilot: "CF-DCF-PILOT-001",
    generatedAt: new Date().toISOString()
  };

  if (type === "all" || type === "concepts") {
    const { data, error } = await supabase
      .from("cf_concepts")
      .select("*")
      .eq("status", "published")
      .like("source_record_key", "DCF-CONCEPT-%")
      .order("source_record_key", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, stage: "concepts", error: error.message }, { status: 500 });
    }

    result.concepts = data || [];
  }

  if (type === "all" || type === "practice") {
    const { data, error } = await supabase
      .from("cf_questions")
      .select("*")
      .eq("status", "published")
      .eq("origin_content_type", "question")
      .like("source_record_key", "DCF-Q-%")
      .order("source_record_key", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, stage: "practice", error: error.message }, { status: 500 });
    }

    result.practice = data || [];
  }

  if (type === "all" || type === "cases") {
    const { data, error } = await supabase
      .from("cf_cases")
      .select("*")
      .eq("status", "published")
      .like("source_record_key", "DCF-CASE-%")
      .order("source_record_key", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, stage: "cases", error: error.message }, { status: 500 });
    }

    result.cases = data || [];
  }

  if (type === "all" || type === "interview") {
    const { data, error } = await supabase
      .from("cf_questions")
      .select("*")
      .eq("status", "published")
      .eq("origin_content_type", "interview_question")
      .like("source_record_key", "DCF-INT-%")
      .order("source_record_key", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, stage: "interview", error: error.message }, { status: 500 });
    }

    result.interview = data || [];
  }

  return NextResponse.json(result);
}
