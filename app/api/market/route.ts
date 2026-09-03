import { NextResponse } from "next/server";

const demoEvents = [
  {
    title: "Rates move after inflation surprise",
    assetClass: "Macro / Fixed Income",
    question: "If the risk-free rate rises 75 bps and exit multiples compress 1.0x, which valuation cases break first?",
    task: "Rebuild a downside DCF/LBO bridge and identify the covenant most exposed to lower exit valuation."
  },
  {
    title: "Sponsor-to-sponsor deal at peak multiple",
    assetClass: "Private Equity / M&A",
    question: "How do you underwrite returns when the seller is already a sophisticated sponsor?",
    task: "List three value-creation levers that are not just multiple expansion."
  },
  {
    title: "Credit spread widening",
    assetClass: "Private Credit",
    question: "When spreads widen, what changes first: entry leverage, pricing, structure or documentation?",
    task: "Draft a 5-line credit committee view with base and stress-case DSCR."
  }
];

export async function GET() {
  const apiUrl = process.env.MARKET_DATA_API_URL;
  const apiKey = process.env.MARKET_DATA_API_KEY;

  if (!apiUrl || !apiKey) {
    return NextResponse.json({
      connected: false,
      warning: "No market data provider is configured. Returning source-safe demo challenges only.",
      events: demoEvents
    });
  }

  try {
    const response = await fetch(apiUrl, {
      headers: { authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 }
    });
    if (!response.ok) throw new Error("provider_error");
    const data = await response.json();
    return NextResponse.json({ connected: true, events: data });
  } catch {
    return NextResponse.json({
      connected: false,
      warning: "Market provider failed. Returning demo challenges instead of fabricating live data.",
      events: demoEvents
    });
  }
}
