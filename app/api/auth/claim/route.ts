import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const keys = Array.isArray(body.clientKeys) ? body.clientKeys.slice(0, 10) : [];
  const results: unknown[] = [];
  for (const value of keys) {
    const key = String(value || "").trim();
    if (!/^[A-Za-z0-9_-]{8,120}$/.test(key)) continue;
    const { data, error } = await supabase.rpc("cf003_claim_legacy_client_key", { p_client_key: key });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    results.push(data);
  }
  return NextResponse.json({ ok: true, claims: results }, { headers: { "Cache-Control": "private, no-store" } });
}
