import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { POST as legacyQualityGate } from "../content-quality-gate-v1/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXPECTED_SEMANTIC_SHA256 = "f9caf4f5ce135fb1c7cee054aa618107a9081d6f637ded511c06edeb5845cabd";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function stableCanonical(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(stableCanonical).join(",")}]`;
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableCanonical(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function POST(request: NextRequest) {
  const text = await request.text();
  let manifest: unknown;
  try {
    manifest = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON manifest." }, { status: 400 });
  }

  const semanticHash = sha256(stableCanonical(manifest));
  if (semanticHash !== EXPECTED_SEMANTIC_SHA256) {
    return NextResponse.json({
      ok: false,
      error: "Quality-review manifest content mismatch. Use the exact 605-object review manifest; filename, whitespace, and line endings do not matter.",
      semanticHash,
    }, { status: 400 });
  }

  // Re-serialize to the exact pretty-printed representation expected by the
  // existing checksum-locked v1 route, then reuse all of its database/gating logic.
  const canonicalPretty = JSON.stringify(manifest, null, 2);
  const forwarded = new NextRequest(new URL("/api/admin/content-quality-gate-v1", request.url), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-capital-forge-remediate": request.headers.get("x-capital-forge-remediate") || "",
    },
    body: canonicalPretty,
  });

  return legacyQualityGate(forwarded);
}
