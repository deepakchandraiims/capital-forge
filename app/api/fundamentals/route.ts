import { NextResponse } from "next/server";

type FmpIncomeStatement = {
  date?: string;
  symbol?: string;
  reportedCurrency?: string;
  revenue?: number;
  grossProfit?: number;
  grossProfitRatio?: number;
  operatingIncome?: number;
  operatingIncomeRatio?: number;
  ebitda?: number;
  ebitdaratio?: number;
  netIncome?: number;
  netIncomeRatio?: number;
  eps?: number;
  epsdiluted?: number;
  link?: string;
  finalLink?: string;
};

const demoFundamentals = {
  symbol: "AAPL",
  provider: "Capital Forge Demo",
  latest: {
    date: "Demo",
    reportedCurrency: "USD",
    revenue: 274_515_000_000,
    grossProfit: 104_956_000_000,
    grossProfitRatio: 0.3823,
    operatingIncome: 66_288_000_000,
    operatingIncomeRatio: 0.2415,
    ebitda: 81_020_000_000,
    ebitdaratio: 0.2951,
    netIncome: 57_411_000_000,
    netIncomeRatio: 0.2091,
    eps: 3.31,
    epsdiluted: 3.28
  },
  practicePrompt: "Use this demo statement to calculate gross margin, EBITDA margin, operating margin and net margin, then write a 5-line equity research comment."
};

function cleanBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "AAPL").trim().toUpperCase();
  const limit = Math.min(10, Number(searchParams.get("limit") || 5));
  const provider = (process.env.FUNDAMENTALS_PROVIDER || "fmp").toLowerCase();
  const apiKey = process.env.FUNDAMENTALS_API_KEY || process.env.FMP_API_KEY;

  if (!apiKey || provider !== "fmp") {
    return NextResponse.json({
      configured: false,
      provider,
      warning: !apiKey ? "FUNDAMENTALS_API_KEY missing. Returning demo fundamentals." : "Only FMP is enabled in this adapter. Returning demo fundamentals.",
      fundamentals: { ...demoFundamentals, symbol }
    });
  }

  try {
    const base = cleanBaseUrl(process.env.FUNDAMENTALS_API_URL || "https://financialmodelingprep.com/api/v3");
    const url = new URL(`${base}/income-statement/${symbol}`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error(`FMP ${response.status}`);
    const data = await response.json() as FmpIncomeStatement[];
    if (!Array.isArray(data) || !data.length) throw new Error("FMP returned no income statement data");

    const latest = data[0];
    return NextResponse.json({
      configured: true,
      provider: "fmp",
      symbol,
      fundamentals: {
        symbol,
        provider: "Financial Modeling Prep",
        latest,
        history: data,
        practicePrompt: `Review ${symbol}'s latest income statement. Calculate revenue growth, gross margin, EBITDA margin, operating margin, net margin and write an investment view.`
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      configured: false,
      provider: "fmp",
      warning: error instanceof Error ? error.message : "FMP request failed. Returning demo fundamentals.",
      fundamentals: { ...demoFundamentals, symbol }
    });
  }
}
