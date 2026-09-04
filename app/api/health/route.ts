import { NextResponse } from "next/server";

function readKeyStatus() {
  const marketPrimary = Boolean(process.env.MARKET_DATA_API_KEY);
  const marketBackup = Boolean(process.env.BACKUP_MARKET_API_KEY || process.env.ALPHA_VANTAGE_API_KEY);

  return {
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    aiConfigured: Boolean(process.env.AI_API_URL && process.env.AI_API_KEY),
    marketConfigured: marketPrimary,
    backupMarketConfigured: marketBackup,
    newsConfigured: Boolean(process.env.NEWS_API_KEY),
    fundamentalsConfigured: Boolean(process.env.FUNDAMENTALS_API_KEY || process.env.FMP_API_KEY),
    filingsConfigured: Boolean(process.env.FILINGS_API_URL && process.env.FILINGS_API_KEY),
    recruiterReviewConfigured: Boolean(process.env.RESUME_REVIEW_API_URL && process.env.RESUME_REVIEW_API_KEY),
    adminSecretConfigured: Boolean(process.env.CAPITAL_FORGE_ADMIN_SECRET)
  };
}

export async function GET() {
  const keyStatus = readKeyStatus();

  return NextResponse.json({
    app: "Capital Forge",
    phase: "phase-e-provider-adapters",
    status: "ok",
    safeMode: !keyStatus.aiConfigured,
    modules: 25,
    providers: {
      news: process.env.NEWS_API_PROVIDER || "marketaux",
      marketData: process.env.MARKET_DATA_PROVIDER || "twelvedata",
      backupMarket: process.env.BACKUP_MARKET_PROVIDER || "alphavantage",
      fundamentals: process.env.FUNDAMENTALS_PROVIDER || "fmp"
    },
    keyStatus,
    generatedAt: new Date().toISOString()
  });
}
