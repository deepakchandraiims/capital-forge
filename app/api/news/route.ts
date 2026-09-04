import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Tone = "blue" | "red" | "green" | "purple" | "black";
type MarketauxItem = { uuid?: string; title?: string; description?: string; snippet?: string; url?: string; image_url?: string; published_at?: string; source?: string; entities?: Array<{ industry?: string; symbol?: string; name?: string }> };
type UiNews = { id: string; tag: string; tone: Tone; title: string; summary: string; time: string; visual: string; imageUrl: string; source: string; url?: string };

const fallbackImages = [
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop"
];

const demoNews: UiNews[] = [
  { id: "demo-news-1", tag: "Markets", tone: "green", title: "Markets desk is ready for live updates", summary: "Refresh to pull Marketaux headlines and convert them into finance drills.", time: "Demo", visual: "📈", imageUrl: fallbackImages[0], source: "Capital Forge" },
  { id: "demo-news-2", tag: "AI & Tech", tone: "purple", title: "AI capex cycle creates valuation debate", summary: "Turn this into a DCF, margin and terminal multiple question.", time: "Demo", visual: "🤖", imageUrl: fallbackImages[1], source: "Capital Forge" },
  { id: "demo-news-3", tag: "Strategy", tone: "blue", title: "Sponsors stay selective on entry multiples", summary: "Practice leverage, exit multiple and downside return sensitivity.", time: "Demo", visual: "🏦", imageUrl: fallbackImages[2], source: "Capital Forge" },
  { id: "demo-news-4", tag: "Business", tone: "red", title: "Renewables deal activity keeps scaling", summary: "Translate strategic buyer appetite into valuation, synergy and risk questions.", time: "Demo", visual: "⚡", imageUrl: fallbackImages[3], source: "Capital Forge" },
  { id: "demo-news-5", tag: "Global", tone: "blue", title: "Macro signals are driving deal timing", summary: "Ask what lower rates mean for valuations, debt capacity and exits.", time: "Demo", visual: "🌐", imageUrl: fallbackImages[4], source: "Capital Forge" }
];

function toneFor(text: string): Tone {
  const lower = text.toLowerCase();
  if (lower.includes("fall") || lower.includes("risk") || lower.includes("debt") || lower.includes("cut") || lower.includes("slump")) return "red";
  if (lower.includes("growth") || lower.includes("raise") || lower.includes("rally") || lower.includes("gain") || lower.includes("beat")) return "green";
  if (lower.includes("ai") || lower.includes("tech") || lower.includes("chip") || lower.includes("semiconductor")) return "purple";
  return "blue";
}

function tagFor(item: MarketauxItem) {
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  if (text.includes("private equity") || text.includes("acquisition") || text.includes("merger") || text.includes("deal")) return "Strategy";
  if (text.includes("credit") || text.includes("debt") || text.includes("bond")) return "Business";
  if (text.includes("ai") || text.includes("semiconductor") || text.includes("technology") || text.includes("chip")) return "AI & Tech";
  if (text.includes("fed") || text.includes("inflation") || text.includes("rate")) return "Markets";
  return item.entities?.[0]?.industry || "Markets";
}

function relativeTime(value?: string) {
  const time = value ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(time)) return "Live";
  const minutes = Math.max(1, Math.round((Date.now() - time) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function ensureFive(items: UiNews[]) {
  const filled = [...items];
  let i = 0;
  while (filled.length < 5) {
    filled.push({ ...demoNews[i % demoNews.length], id: `fill-${i}-${Date.now()}` });
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
  const limit = 5;
  const symbols = searchParams.get("symbols") || "AAPL,MSFT,NVDA,TSLA,JPM,GS,SPY,QQQ";

  if (!apiKey || provider !== "marketaux") {
    return NextResponse.json({ configured: false, provider, source: apiKey ? "unsupported" : "demo", news: ensureFive(demoNews), generatedAt: new Date().toISOString() });
  }

  try {
    const url = new URL(headerUrl || process.env.NEWS_API_URL || "https://api.marketaux.com/v1/news/all");
    url.searchParams.set("api_token", apiKey);
    url.searchParams.set("language", "en");
    url.searchParams.set("limit", "5");
    url.searchParams.set("symbols", symbols);
    url.searchParams.set("filter_entities", "true");

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Marketaux ${response.status}`);
    const payload = (await response.json()) as { data?: MarketauxItem[] };
    const items = Array.isArray(payload.data) ? payload.data : [];

    const news = items.slice(0, limit).map((item, index) => {
      const title = item.title || "Untitled market update";
      return {
        id: item.uuid || `marketaux-${index}`,
        tag: tagFor(item),
        tone: toneFor(`${title} ${item.description || ""}`),
        title,
        summary: item.description || item.snippet || "Open this live item and convert it into a valuation, credit or interview drill.",
        time: relativeTime(item.published_at),
        visual: "📈",
        imageUrl: item.image_url || fallbackImages[index % fallbackImages.length],
        source: item.source || "Marketaux",
        url: item.url
      } satisfies UiNews;
    });

    return NextResponse.json({ configured: true, provider: "marketaux", source: process.env.NEWS_API_KEY ? "vercel-env" : "browser-vault", news: ensureFive(news), generatedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ configured: false, provider: "marketaux", source: "fallback", warning: error instanceof Error ? error.message : "Marketaux request failed", news: ensureFive(demoNews), generatedAt: new Date().toISOString() });
  }
}
