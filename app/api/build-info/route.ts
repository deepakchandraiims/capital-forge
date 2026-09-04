import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    app: "Capital Forge",
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
    deploymentUrl: process.env.VERCEL_URL || null,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
    region: process.env.VERCEL_REGION || null,
    routingArchitecture: "next16-proxy-plus-direct-route-bridge-v3",
    expectedRoutes: ["/home", "/dashboard", "/feedback", "/interview", "/interview/session/:id", "/interview/session/:id/results"],
    generatedAt: new Date().toISOString()
  }, {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
