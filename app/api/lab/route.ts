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
  const envStatus = Object.fromEntries(requiredKeys.map((key) => [key, Boolean(process.env[key])])) as Record<string, boolean>;
  return {
    ...envStatus,
    BROWSER_AI_VAULT: Boolean(headers?.get("x-capital-forge-ai-url") && headers?.get("x-capital-forge-ai-key")),
    BROWSER_NEWS_VAULT: Boolean(headers?.get("x-capital-forge-news-key")),
    BROWSER_MARKET_VAULT: Boolean(headers?.get("x-capital-forge-market-key")),
    BROWSER_BACKUP_MARKET_VAULT: Boolean(headers?.get("x-capital-forge-backup-market-key")),
    BROWSER_FUNDAMENTALS_VAULT: Boolean(headers?.get("x-capital-forge-fundamentals-key"))
  };
}

function clean(value?: string | null) {
  return String(value || "").trim().replace(/^['"`]+|['"`]+$/g, "");
}

function resolveModel(apiUrl: string, rawModel?: string | null) {
  const model = clean(rawModel);
  if (apiUrl.includes("integrate.api.nvidia.com") && (!model || model === "gpt-4.1-mini")) {
    return "nvidia/nemotron-3.5-lightning-30b-a3b";
  }
  return model || "gpt-4.1-mini";
}

function aiPayload(apiUrl: string, model: string, moduleName: string, input: string) {
  const isNvidia = apiUrl.includes("integrate.api.nvidia.com");
  const base = {
    model,
    temperature: isNvidia ? 0.6 : 0.25,
    top_p: isNvidia ? 0.95 : undefined,
    max_tokens: isNvidia ? 1800 : 1600,
    messages: [
      {
        role: "system",
        content:
          "You are Capital Forge: an elite PE/IB/VC/private credit training engine. Be direct, technical, interview-grade and action-oriented. Never invent live market facts."
      },
      {
        role: "user",
        content: `Module: ${moduleName}\nUser input: ${input || "Create a sharp finance practice drill."}\nReturn: title, answer, key formulas, 3 pressure questions, and next drill.`
      }
    ]
  } as Record<string, unknown>;

  if (isNvidia) {
    base.extra_body = { chat_template_kwargs: { enable_thinking: false } };
  }

  return JSON.parse(JSON.stringify(base));
}

function extractOutput(json: any) {
  const choice = json?.choices?.[0];
  const message = choice?.message || choice?.delta || {};
  return (
    message.content ||
    message.reasoning_content ||
    choice?.text ||
    json?.output_text ||
    "No provider output returned."
  );
}

function safeFallback(moduleName: string, input: string, warning?: string) {
  return {
    configured: false,
    module: moduleName || "fallback",
    output: `Local fallback for ${moduleName || "AI Lab"}: start with conclusion, quantify the driver, identify the risk, pressure-test downside, and end with a decision. Input received: ${input || "No input"}`,
    nextStep: warning || "Check AI_API_URL, AI_API_KEY, AI_MODEL and redeploy after editing Vercel env."
  };
}

export async function GET(request: Request) {
  const keyStatus = status(request.headers);
  return NextResponse.json({
    app: "Capital Forge",
    phase: "phase-f-nvidia-ready-ai-layer",
    mode: process.env.AI_API_KEY || request.headers.get("x-capital-forge-ai-key") ? "connected" : "safe-demo",
    modules,
    keyStatus,
    message: process.env.AI_API_KEY || request.headers.get("x-capital-forge-ai-key")
      ? "AI provider detected. POST requests use the OpenAI-compatible route with NVIDIA NIM hardening."
      : "No AI key configured. Local coaching remains active."
  });
}

export async function POST(req: Request) {
  let moduleName = "AI Mentor Personas";
  let input = "";
  try {
    const body = await req.json();
    moduleName = clean(body.module) || "AI Mentor Personas";
    input = String(body.input || "").trim();
    const apiUrl = clean(process.env.AI_API_URL || req.headers.get("x-capital-forge-ai-url"));
    const apiKey = clean(process.env.AI_API_KEY || req.headers.get("x-capital-forge-ai-key"));
    const model = resolveModel(apiUrl, process.env.AI_MODEL || req.headers.get("x-capital-forge-ai-model") || body.model);

    if (!apiUrl || !apiKey) {
      return NextResponse.json(safeFallback(moduleName, input, "AI key or URL missing."));
    }

    const endpoint = apiUrl.endsWith("/chat/completions") ? apiUrl : `${apiUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(aiPayload(apiUrl, model, moduleName, input))
    });

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json({
        ...safeFallback(moduleName, input, `AI provider rejected the call: ${response.status} ${text.slice(0, 500)}`),
        providerStatus: response.status,
        source: process.env.AI_API_KEY ? "vercel-env" : "browser-vault",
        model
      });
    }

    const json = text ? JSON.parse(text) : {};
    return NextResponse.json({
      configured: true,
      source: process.env.AI_API_KEY ? "vercel-env" : "browser-vault",
      model,
      module: moduleName,
      output: extractOutput(json),
      nextStep: "Save this as a coach review, attempt, journal entry, IC note or project score."
    });
  } catch (error) {
    return NextResponse.json(safeFallback(moduleName, input, error instanceof Error ? error.message : "AI lab request failed."));
  }
}
