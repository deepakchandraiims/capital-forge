import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { POST as legacyImport } from "../content-import/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Temporary one-time import access. Only the SHA-256 hash is committed.
// The plaintext token is never stored in GitHub.
const TEMP_IMPORT_TOKEN_SHA256 = "0755dae3015ca82bc14e495bcded3882b495a0ad86361fbacd6721a40d0a12b3";

function tokenMatches(value: string | null) {
  const supplied = (value || "").trim();
  if (!supplied) return false;

  const actual = createHash("sha256").update(supplied).digest();
  const expected = Buffer.from(TEMP_IMPORT_TOKEN_SHA256, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  const suppliedToken = request.headers.get("x-capital-forge-admin");
  if (!tokenMatches(suppliedToken)) {
    return NextResponse.json({ ok: false, error: "Invalid temporary import access token." }, { status: 401 });
  }

  const configuredAdminSecret = process.env.CAPITAL_FORGE_ADMIN_SECRET;
  if (!configuredAdminSecret) {
    return NextResponse.json(
      { ok: false, error: "CAPITAL_FORGE_ADMIN_SECRET is not configured on the deployed server." },
      { status: 503 }
    );
  }

  // Forward internally to the proven importer using the server's own configured secret.
  // This removes browser/Vercel-secret mismatch while keeping the legacy importer protected.
  const body = await request.text();
  const forwarded = new Request(new URL("/api/admin/content-import", request.url), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-capital-forge-admin": configuredAdminSecret,
    },
    body,
  });

  return legacyImport(forwarded);
}
