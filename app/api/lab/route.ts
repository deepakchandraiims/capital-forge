import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const modules = [
  "Recruiter Mode",
  "MD Pressure Room",
  "Deal Teardown Library",
  "Excel Muscle Memory",
  "Model Error Hunter",
  "IC Memo Builder",
  "Would You Invest Game",
  "Live News Question Engine",
  "Personal Weakness Graph",
  "Interview Bank by Firm",
  "Deal Math Speed Trainer",
  "Investment Journal AI",
  "Pitchbook Simulator",
  "LBO Paper Test",
  "Private Credit Underwriting",
  "Founder Call Simulator",
  "Red Flag Detector",
  "Cap Table Simulator",
  "Career Path Engine",
  "Portfolio Project Tracker",
  "Real Filing Reader",
  "AI Mentor Personas",
  "Bad Answer Rewriter",
  "Case Competition Mode",
  "Daily Killer Insight"
];

const requiredKeys = [
  "AI_API_URL",
  "AI_API_KEY",
  "AI_MODEL",
  "MARKET_DATA_API_URL",
  "MARKET_DATA_API_KEY",
  "NEWS_API_URL",
  "NEWS_API_KEY",
  "FILINGS_API_URL",
  "FILINGS_API_KEY",
  "RESUME_REVIEW_API_URL",
  "RESUME_REVIEW_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
];

function status(headers?: Headers) {
  const envStatus = Object.fromEntries(requiredKeys.map((key) => [key, Boolean(process.env[key])]));
  return {
    ...envStatus,
    BROWSER_AI_VAULT: Boolean(headers?.get("x-capital-forge-ai-url") && headers?.get("x-capital-forge-ai-key")),
    BROWSER_NEWS_VAULT: Boolean(headers?.get("x-capital-forge-news-key")),
    BROWSER_MARKET_VAULT: Boolean(headers?.get("x-capital-forge-market-key")),
    BROWSER_BACKUP_MARKET_VAULT: Boolean(headers?.get("x-capital-forge-backup-market-key")),
    BROWSER_FUNDAMENTALS_VAULT: Boolean(headers?.get("x-capital-forge-fundamentals-key"))
  };
}

export async function GET(request: Request) {
  const keyStatus = status(request.headers);
  return NextResponse.json({
    app: "Capital Forge",
    phase: "phase-e-api-vault-ai-layer",
    mode: process.env.AI_API_KEY || request.headers.get("x-capital-forge-ai-key") ? "connected" : "safe-demo",
    modules,
    keyStatus,
    message: process.env.AI_API_KEY || request.headers.get("x-capital-forge-ai-key")
      ? "AI provider detected through Vercel env or browser vault. Advanced modules can call the configured provider."
      : "No AI provider key is configured yet. The app will use deterministic local coaching and demo simulations."
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const moduleName = String(body.module || "AI Mentor Personas");
    const input = String(body.input || "").trim();
    const apiUrl = process.env.AI_API_URL || req.headers.get("x-capital-forge-ai-url") || "";
    const apiKey = process.env.AI_API_KEY || req.headers.get("x-capital-forge-ai-key") || "";
    const model = process.env.AI_MODEL || req.headers.get("x-capital-forge-ai-model") || body.model || "gpt-4.1-mini";

    if (!apiUrl || !apiKey) {
      return NextResponse.json({
        configured: false,
        module: moduleName,
        output: `Safe-demo output for ${moduleName}: start with conclusion, quantify the driver, identify the risk, pressure-test downside, and end with a decision. Input received: ${input || "No input"}`,
        nextStep: "Add AI API URL/key in the API tab or add AI_API_URL and AI_API_KEY in Vercel env to switch from demo to AI provider mode."
      });
    }

    const endpoint = apiUrl.endsWith("/chat/completions") ? apiUrl : `${apiUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        messages: [
          {
            role: "system",
            content: "You are Capital Forge: an elite PE/IB/VC/private credit training engine. Be direct, technical, interview-grade and action-oriented. Never invent live market facts."
          },
          {
            role: "user",
            content: JSON.stringify({ module: moduleName, input })
          }
        ]
      })
    });

    if (!response.ok) throw new Error(`provider_failed_${response.status}`);
    const json = await response.json();
    return NextResponse.json({
      configured: true,
      source: process.env.AI_API_KEY ? "vercel-env" : "browser-vault",
      model,
      module: moduleName,
      output: json?.choices?.[0]?.message?.content || "No provider output returned.",
      nextStep: "Save this as a coach review, attempt, journal entry, IC note or project score in Supabase later."
    });
  } catch {
    return NextResponse.json({
      configured: false,
      module: "fallback",
      output: "The AI lab request could not be processed. Local fallback remains active.",
      nextStep: "Check API URL, key, model name and provider response format."
    });
  }
}
