import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Tone = "blue" | "red" | "green" | "purple" | "black";

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

const premiumImages = [
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=900&auto=format&fit=crop"
];

const demoNews = [
  { id: "demo-news-1", tag: "Markets", tone: "green", title: "Equities rally on cooling inflation; tech leads gains", summary: "S&P 500 rises as investors weigh rates, earnings and positioning into quarter-end.", time: "2h ago", visual: "📈", imageUrl: premiumImages[0], source: "Capital Forge" },
  { id: "demo-news-2", tag: "AI & Tech", tone: "purple", title: "AI infrastructure cycle creates valuation debate", summary: "Turn this into a DCF, margin, reinvestment and terminal multiple practice case.", time: "3h ago", visual: "🤖", imageUrl: premiumImages[1], source: "Capital Forge" },
  { id: "demo-news-3", tag: "Strategy", tone: "blue", title: "PE firms sit on dry powder as exits slowly reopen", summary: "Practice sponsor logic: entry multiple, leverage, exit path and downside protection.", time: "4h ago", visual: "🏦", imageUrl: premiumImages[2], source: "Capital Forge" },
  { id: "demo-news-4", tag: "Business", tone: "red", title: "Renewables M&A gains traction as capital rotates", summary: "Strategic acquirers and infra funds continue searching for scalable platforms.", time: "5h ago", visual: "⚡", imageUrl: premiumImages[3], source: "Capital Forge" },
  { id: "demo-news-5", tag: "Global", tone: "blue", title: "Global markets mixed ahead of central bank signals", summary: "Investors are watching rates, growth revisions and currency moves for allocation clues.", time: "6h ago", visual: "🌐", imageUrl: premiumImages[4], source: "Capital Forge" }
] as const;

function toneFor(title: string): Tone {
  const lower = title.toLowerCase();
  if (lower.includes("fall") || lower.includes("risk") || lower.includes("debt") || lower.includes("cuts") || lower.includes("slump")) return "red";
  if (lower.includes("growth") || lower.includes("raise") || lower.includes("rally") || lower.includes("gain") || lower.includes("beats")) return "green";
  if (lower.includes("ai") || lower.includes("tech") || lower.includes("chip") || lower.includes("software")) return "purple";
  if (lower.includes("goldman") || lower.includes("bank") || lower.includes("finance") || lower.includes("fund")) return "black";
  return "blue";
}

function tagFor(item: MarketauxItem) {
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  if (text.includes("private equity") || text.includes("acquisition") || text.includes("merger") || text.includes("deal")) return "PE / M&A";
  if (text.includes("credit") || text.includes("debt") || text.includes("bond")) return "Credit";
  if (text.includes("ai") || text.includes("semiconductor") || text.includes("technology") || text.includes("chip") || text.includes("software")) return "AI & Tech";
  if (text.includes("fed") || text.includes("inflation") || text.includes("rate")) return "Macro";
  if (text.includes("energy") || text.includes("renewable") || text.includes("power")) return "Business";
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

function stableImage(index: number) {
  return premiumImages[index % premiumImages.length];
}

function fillToFive(news: Array<any>) {
  const filled = [...news];
  let i = 0;
  while (filled.length < 5) {
    filled.push({ ...demoNews[i % demoNews.length], id: `fill-${i}-${demoNews[i % demoNews.length].id}` });
    i += 1;
  }
  return filled.slice(0, 5);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const headerProvider = request.headers.get("x-capital-forge-news-provider");
  const headerUrl = request.headers.get("x-capital-forge-news-url");
  const headerKey = request.headers.get("x-capital-forge-news-key");
  const provider = (process.env.NEWS_API_PROVIDER || headerProvider || "marketaux").toLowerCase();
  const apiKey = process.env.NEWS_API_KEY || headerKey || "";
  const requestedLimit = Number(searchParams.get("limit") || 5);
  const limit = Math.max(5, Math.min(10, Number.isFinite(requestedLimit) ? requestedLimit : 5));
  const symbols = searchParams.get("symbols") || "AAPL,MSFT,NVDA,TSLA,JPM,GS,SPY,QQQ";

  if (!apiKey || provider !== "marketaux") {
    return NextResponse.json({
      configured: false,
      provider,
      source: apiKey ? "unsupported" : "demo",
      warning: !apiKey ? "NEWS_API_KEY missing. Returning premium demo news." : "Only Marketaux is enabled in this adapter. Returning premium demo news.",
      news: fillToFive([...demoNews])
    });
  }

  try {
    const url = new URL(headerUrl || process.env.NEWS_API_URL || "https://api.marketaux.com/v1/news/all");
    url.searchParams.set("api_token", apiKey);
    url.searchParams.set("language", "en");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("symbols", symbols);
    url.searchParams.set("filter_entities", "true");

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Marketaux ${response.status}`);

    const payload = (await response.json()) as { data?: MarketauxItem[]; error?: unknown };
    const items = Array.isArray(payload.data) ? payload.data : [];
    if (!items.length) throw new Error("Marketaux returned no articles");

    const news = items.slice(0, limit).map((item, index) => {
      const title = item.title || "Untitled market update";
      const tag = tagFor(item);
      return {
        id: item.uuid || `marketaux-${index}`,
        tag,
        tone: toneFor(`${title} ${tag}`),
        title,
        summary: item.description || item.snippet || "Open this live item and convert it into a valuation, credit or interview drill.",
        time: relativeTime(item.published_at),
        visual: "",
        imageUrl: stableImage(index),
        source: item.source || "Marketaux",
        url: item.url
      };
    });

    return NextResponse.json({ configured: true, provider: "marketaux", source: process.env.NEWS_API_KEY ? "vercel-env" : "browser-vault", news: fillToFive(news), generatedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({
      configured: false,
      provider: "marketaux",
      source: "fallback",
      warning: error instanceof Error ? error.message : "Marketaux request failed. Returning premium demo news.",
      news: fillToFive([...demoNews])
    });
  }
}