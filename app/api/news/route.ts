import { NextResponse } from "next/server";

type MarketauxItem = {
  uuid?: string;
  title?: string;
  description?: string;
  snippet?: string;
  url?: string;
  image_url?: string;
  published_at?: string;
  source?: string;
  entities?: Array<{ symbol?: string; exchange?: string; name?: string; industry?: string }>;
};

const demoNews = [
  {
    id: "demo-news-1",
    tag: "Markets",
    tone: "blue",
    title: "Markets update unavailable — practice mode active",
    summary: "Connect Marketaux in Vercel env to replace this with live financial news.",
    time: "Demo",
    visual: "📈",
    source: "Capital Forge Demo"
  },
  {
    id: "demo-news-2",
    tag: "PE / M&A",
    tone: "red",
    title: "Sponsor entry multiples remain a key underwriting variable",
    summary: "Use this fallback card to practice entry multiple, leverage and downside return sensitivity.",
    time: "Demo",
    visual: "🏦",
    source: "Capital Forge Demo"
  },
  {
    id: "demo-news-3",
    tag: "Credit",
    tone: "green",
    title: "Private credit case mode is ready",
    summary: "Test DSCR, covenants, recovery and refinancing risk until a live provider is connected.",
    time: "Demo",
    visual: "🧾",
    source: "Capital Forge Demo"
  }
];

function toneFor(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("fall") || lower.includes("risk") || lower.includes("debt") || lower.includes("cuts")) return "red";
  if (lower.includes("growth") || lower.includes("raise") || lower.includes("rally") || lower.includes("gain")) return "green";
  if (lower.includes("ai") || lower.includes("tech")) return "black";
  return "blue";
}

function tagFor(item: MarketauxItem) {
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  if (text.includes("private equity") || text.includes("acquisition") || text.includes("merger") || text.includes("deal")) return "PE / M&A";
  if (text.includes("credit") || text.includes("debt") || text.includes("bond")) return "Credit";
  if (text.includes("ai") || text.includes("semiconductor") || text.includes("technology")) return "AI & Tech";
  if (text.includes("fed") || text.includes("inflation") || text.includes("rate")) return "Macro";
  return item.entities?.[0]?.industry || "Markets";
}

function relativeTime(value?: string) {
  if (!value) return "Live";
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "Live";
  const minutes = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = (process.env.NEWS_API_PROVIDER || "marketaux").toLowerCase();
  const apiKey = process.env.NEWS_API_KEY;
  const limit = Math.min(10, Number(searchParams.get("limit") || 8));
  const symbols = searchParams.get("symbols") || "AAPL,MSFT,NVDA,TSLA,JPM,GS,SPY,QQQ";

  if (!apiKey || provider !== "marketaux") {
    return NextResponse.json({
      configured: false,
      provider,
      warning: !apiKey ? "NEWS_API_KEY missing. Returning demo news." : "Only Marketaux is enabled in this adapter. Returning demo news.",
      news: demoNews
    });
  }

  try {
    const url = new URL(process.env.NEWS_API_URL || "https://api.marketaux.com/v1/news/all");
    url.searchParams.set("api_token", apiKey);
    url.searchParams.set("language", "en");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("symbols", symbols);
    url.searchParams.set("filter_entities", "true");

    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) throw new Error(`Marketaux ${response.status}`);

    const payload = (await response.json()) as { data?: MarketauxItem[]; error?: unknown };
    const items = Array.isArray(payload.data) ? payload.data : [];
    if (!items.length) throw new Error("Marketaux returned no articles");

    const news = items.slice(0, limit).map((item, index) => {
      const title = item.title || "Untitled market update";
      return {
        id: item.uuid || `marketaux-${index}`,
        tag: tagFor(item),
        tone: toneFor(title),
        title,
        summary: item.description || item.snippet || "Open this live item and convert it into a valuation, credit or interview drill.",
        time: relativeTime(item.published_at),
        visual: item.image_url ? "📰" : "📈",
        source: item.source || "Marketaux",
        url: item.url
      };
    });

    return NextResponse.json({ configured: true, provider: "marketaux", news, generatedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({
      configured: false,
      provider: "marketaux",
      warning: error instanceof Error ? error.message : "Marketaux request failed. Returning demo news.",
      news: demoNews
    });
  }
}
