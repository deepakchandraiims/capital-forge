import { NextResponse } from "next/server";

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

function status() {
  return Object.fromEntries(requiredKeys.map((key) => [key, Boolean(process.env[key])]));
}

export async function GET() {
  const keyStatus = status();
  return NextResponse.json({
    app: "Capital Forge",
    phase: "world-class-ai-layer",
    mode: process.env.AI_API_KEY ? "connected" : "safe-demo",
    modules,
    keyStatus,
    message: process.env.AI_API_KEY
      ? "AI provider detected. Advanced modules can call the configured provider."
      : "No AI provider key is configured yet. The app will use deterministic local coaching and demo simulations."
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const moduleName = String(body.module || "AI Mentor Personas");
    const input = String(body.input || "").trim();
    const apiUrl = process.env.AI_API_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL || "gpt-4.1-mini";

    if (!apiUrl || !apiKey) {
      return NextResponse.json({
        configured: false,
        module: moduleName,
        output: `Safe-demo output for ${moduleName}: start with conclusion, quantify the driver, identify the risk, pressure-test downside, and end with a decision. Input received: ${input || "No input"}`,
        nextStep: "Add AI_API_URL and AI_API_KEY in Vercel to switch this module from local demo to AI provider mode."
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

    if (!response.ok) throw new Error("provider_failed");
    const json = await response.json();
    return NextResponse.json({
      configured: true,
      module: moduleName,
      output: json?.choices?.[0]?.message?.content || "No provider output returned.",
      nextStep: "Save this as a coach review, attempt, journal entry, IC note or project score in Supabase."
    });
  } catch {
    return NextResponse.json({
      configured: false,
      module: "fallback",
      output: "The AI lab request could not be processed. Local fallback remains active.",
      nextStep: "Check API URL, key and provider response format."
    });
  }
}
