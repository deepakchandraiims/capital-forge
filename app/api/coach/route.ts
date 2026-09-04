import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CoachRequest = {
  mode?: string;
  question?: string;
  answer?: string;
  context?: string;
  model?: string;
};

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

function localCoach(body: CoachRequest, warning?: string) {
  const answer = (body.answer || "").trim();
  const context = body.context || body.question || "finance practice";
  const weak = answer.length < 120;
  return {
    mode: "local",
    score: weak ? 5 : 7,
    feedback: weak
      ? "Your answer needs more investment logic. Add the core formula or driver, then explain risk, downside and decision impact."
      : "Good direction. To make it sharper, lead with the conclusion, quantify the driver and close with what would change your recommendation.",
    strongerAnswer: `A stronger response should start with the conclusion, connect it to ${context}, quantify the value or risk driver, and then mention the key caveat. In interviews and IC discussions, avoid formula-only answers; show how the point affects valuation, leverage, downside protection or decision quality.`,
    followUp: warning || "Give me the same answer again, but in 45 seconds as if a PE partner interrupted you halfway.",
    configured: false
  };
}

function buildPayload(apiUrl: string, model: string, body: CoachRequest) {
  const isNvidia = apiUrl.includes("integrate.api.nvidia.com");
  const payload = {
    model,
    temperature: isNvidia ? 0.55 : 0.2,
    top_p: isNvidia ? 0.95 : undefined,
    max_tokens: isNvidia ? 1600 : 1400,
    messages: [
      {
        role: "system",
        content:
          "You are Capital Forge, an institutional finance coach for PE, IB, VC, private credit and public markets. Grade answers like a demanding associate/VP. Be concise, technical, practical and interview-oriented."
      },
      {
        role: "user",
        content: `Mode: ${body.mode || "practice_review"}\nQuestion: ${body.question || ""}\nAnswer: ${body.answer || ""}\nContext: ${body.context || ""}\nReturn JSON-like sections: Score / Feedback / Stronger answer / Follow-up pressure question.`
      }
    ]
  } as Record<string, unknown>;

  if (isNvidia) payload.extra_body = { chat_template_kwargs: { enable_thinking: false } };
  return JSON.parse(JSON.stringify(payload));
}

function extractText(json: any) {
  const choice = json?.choices?.[0];
  const message = choice?.message || choice?.delta || {};
  return message.content || message.reasoning_content || choice?.text || json?.output_text || "";
}

export async function POST(req: Request) {
  let body: CoachRequest = {};
  try {
    body = (await req.json()) as CoachRequest;
    const apiUrl = clean(process.env.AI_API_URL || req.headers.get("x-capital-forge-ai-url"));
    const apiKey = clean(process.env.AI_API_KEY || req.headers.get("x-capital-forge-ai-key"));
    const model = resolveModel(apiUrl, process.env.AI_MODEL || req.headers.get("x-capital-forge-ai-model") || body.model);

    if (!apiUrl || !apiKey) return NextResponse.json(localCoach(body, "AI key or URL missing."));

    const endpoint = apiUrl.endsWith("/chat/completions")
      ? apiUrl
      : `${apiUrl.replace(/\/$/, "")}/chat/completions`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(buildPayload(apiUrl, model, body))
    });

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json({
        ...localCoach(body, `AI provider rejected the call: ${response.status} ${text.slice(0, 500)}`),
        providerStatus: response.status,
        source: process.env.AI_API_KEY ? "vercel-env" : "browser-vault",
        model
      });
    }

    const json = text ? JSON.parse(text) : {};
    const aiText = extractText(json) || "AI provider returned an empty response.";
    return NextResponse.json({
      mode: "ai",
      score: 8,
      feedback: aiText.slice(0, 2000),
      strongerAnswer: "Use the AI feedback above to rewrite your answer with conclusion → calculation/driver → risk → recommendation.",
      followUp: "Now answer the same question as a skeptical MD asks: what could break this thesis?",
      configured: true,
      source: process.env.AI_API_KEY ? "vercel-env" : "browser-vault",
      model
    });
  } catch (error) {
    return NextResponse.json(localCoach(body, error instanceof Error ? error.message : "AI coach request failed."));
  }
}
