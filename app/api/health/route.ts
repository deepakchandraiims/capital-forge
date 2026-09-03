import { NextResponse } from "next/server";

const keyStatus = {
  supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  aiConfigured: Boolean(process.env.AI_API_URL && process.env.AI_API_KEY),
  marketConfigured: Boolean(process.env.MARKET_DATA_API_URL && process.env.MARKET_DATA_API_KEY),
  newsConfigured: Boolean(process.env.NEWS_API_URL && process.env.NEWS_API_KEY),
  filingsConfigured: Boolean(process.env.FILINGS_API_URL && process.env.FILINGS_API_KEY),
  recruiterReviewConfigured: Boolean(process.env.RESUME_REVIEW_API_URL && process.env.RESUME_REVIEW_API_KEY),
  adminSecretConfigured: Boolean(process.env.CAPITAL_FORGE_ADMIN_SECRET)
};

export async function GET() {
  return NextResponse.json({
    app: "Capital Forge",
    phase: "3-plus-world-class-ai-layer",
    status: "ok",
    safeMode: !keyStatus.aiConfigured,
    modules: 25,
    keyStatus,
    generatedAt: new Date().toISOString()
  });
}
