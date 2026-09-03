import { NextResponse } from "next/server";

type CoachRequest = {
  mode?: string;
  question?: string;
  answer?: string;
  context?: string;
};

function localCoach(body: CoachRequest) {
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
    followUp: "Give me the same answer again, but in 45 seconds as if a PE partner interrupted you halfway.",
    configured: false
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CoachRequest;
    const apiUrl = process.env.AI_API_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL || "gpt-4.1-mini";

    if (!apiUrl || !apiKey) return NextResponse.json(localCoach(body));

    const endpoint = apiUrl.endsWith("/chat/completions")
      ? apiUrl
      : `${apiUrl.replace(/\/$/, "")}/chat/completions`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are Capital Forge, an institutional finance coach for PE, IB, VC, private credit and public markets. Grade answers like a demanding associate/VP. Be concise, technical, practical and interview-oriented."
          },
          {
            role: "user",
            content: JSON.stringify({
              mode: body.mode || "practice_review",
              question: body.question || "",
              answer: body.answer || "",
              context: body.context || ""
            })
          }
        ]
      })
    });

    if (!response.ok) return NextResponse.json(localCoach(body));
    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content || "";
    return NextResponse.json({
      mode: "ai",
      score: 8,
      feedback: text.slice(0, 1800),
      strongerAnswer: "Use the AI feedback above to rewrite your answer with conclusion → calculation/driver → risk → recommendation.",
      followUp: "Now answer the same question as a skeptical MD asks: what could break this thesis?",
      configured: true
    });
  } catch {
    return NextResponse.json(localCoach({}));
  }
}
