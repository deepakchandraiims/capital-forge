import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    app: "Capital Forge",
    phase: "3",
    status: "ok",
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    aiConfigured: Boolean(process.env.AI_API_URL && process.env.AI_API_KEY),
    marketConfigured: Boolean(process.env.MARKET_DATA_API_URL && process.env.MARKET_DATA_API_KEY),
    generatedAt: new Date().toISOString()
  });
}
