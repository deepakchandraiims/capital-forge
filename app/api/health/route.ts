import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function hasEnv(...keys: string[]) {
  return keys.every((key) => Boolean(process.env[key]));
}

function hasHeader(headers: Headers, ...keys: string[]) {
  return keys.every((key) => Boolean(headers.get(key)));
}

function source(envReady: boolean, localReady: boolean) {
  if (envReady) return "vercel-env";
  if (localReady) return "browser-vault";
  return "missing";
}

function readKeyStatus(headers: Headers) {
  const supabaseEnv = hasEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const aiEnv = hasEnv("AI_API_URL", "AI_API_KEY");
  const aiLocal = hasHeader(headers, "x-capital-forge-ai-url", "x-capital-forge-ai-key");
  const marketEnv = Boolean(process.env.MARKET_DATA_API_KEY);
  const marketLocal = Boolean(headers.get("x-capital-forge-market-key"));
  const backupEnv = Boolean(process.env.BACKUP_MARKET_API_KEY || process.env.ALPHA_VANTAGE_API_KEY);
  const backupLocal = Boolean(headers.get("x-capital-forge-backup-market-key"));
  const newsEnv = Boolean(process.env.NEWS_API_KEY);
  const newsLocal = Boolean(headers.get("x-capital-forge-news-key"));
  const fundamentalsEnv = Boolean(process.env.FUNDAMENTALS_API_KEY || process.env.FMP_API_KEY);
  const fundamentalsLocal = Boolean(headers.get("x-capital-forge-fundamentals-key"));

  return {
    keyStatus: {
      supabaseConfigured: supabaseEnv,
      aiConfigured: aiEnv || aiLocal,
      marketConfigured: marketEnv || marketLocal,
      backupMarketConfigured: backupEnv || backupLocal,
      newsConfigured: newsEnv || newsLocal,
      fundamentalsConfigured: fundamentalsEnv || fundamentalsLocal,
      filingsConfigured: hasEnv("FILINGS_API_URL", "FILINGS_API_KEY"),
      recruiterReviewConfigured: hasEnv("RESUME_REVIEW_API_URL", "RESUME_REVIEW_API_KEY"),
      adminSecretConfigured: Boolean(process.env.CAPITAL_FORGE_ADMIN_SECRET)
    },
    sources: {
      supabase: source(supabaseEnv, false),
      ai: source(aiEnv, aiLocal),
      marketData: source(marketEnv, marketLocal),
      backupMarket: source(backupEnv, backupLocal),
      news: source(newsEnv, newsLocal),
      fundamentals: source(fundamentalsEnv, fundamentalsLocal)
    }
  };
}

export async function GET(request: Request) {
  const { keyStatus, sources } = readKeyStatus(request.headers);

  return NextResponse.json({
    app: "Capital Forge",
    phase: "phase-e-api-vault-provider-adapters",
    status: "ok",
    safeMode: !keyStatus.aiConfigured,
    modules: 25,
    providers: {
      news: process.env.NEWS_API_PROVIDER || request.headers.get("x-capital-forge-news-provider") || "marketaux",
      marketData: process.env.MARKET_DATA_PROVIDER || request.headers.get("x-capital-forge-market-provider") || "twelvedata",
      backupMarket: process.env.BACKUP_MARKET_PROVIDER || "alphavantage",
      fundamentals: process.env.FUNDAMENTALS_PROVIDER || "fmp",
      ai: process.env.AI_PROVIDER || request.headers.get("x-capital-forge-ai-provider") || "openai-compatible"
    },
    sources,
    keyStatus,
    generatedAt: new Date().toISOString()
  });
}
