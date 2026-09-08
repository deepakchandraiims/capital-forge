import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { AccountRole, AccountStatus } from "../auth/server";

type CookieWrite = { name: string; value: string; options?: Record<string, unknown> };

export type ProxyProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: AccountRole;
  status: AccountStatus;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
};

type VerifiedUser = {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
};

function cleanAuthHeaders(headers: Headers) {
  for (const key of Array.from(headers.keys())) {
    if (key.toLowerCase().startsWith("x-cf-auth-")) headers.delete(key);
  }
}

function encoded(value: string | null | undefined) {
  return encodeURIComponent(String(value || ""));
}

export async function readProxyAuth(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const cookieWrites: CookieWrite[] = [];
  const hadAuthCookie = request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));

  if (!url || !key) {
    const requestHeaders = new Headers(request.headers);
    cleanAuthHeaders(requestHeaders);
    return {
      response: NextResponse.next({ request: { headers: requestHeaders } }),
      cookieWrites,
      user: null as VerifiedUser | null,
      profile: null as ProxyProfile | null,
      hadAuthCookie
    };
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          cookieWrites.push({ name, value, options: options as Record<string, unknown> });
        });
      }
    }
  });

  // getClaims verifies the JWT locally against Supabase JWKS on modern projects.
  // This avoids a remote Auth-server round trip on every tab and API request.
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsError ? null : claimsData?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  const email = typeof claims?.email === "string" ? claims.email : null;
  const user: VerifiedUser | null = userId
    ? { id: userId, email, email_confirmed_at: email ? "verified" : null }
    : null;

  let profile: ProxyProfile | null = null;
  if (userId) {
    const { data } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,status,created_at,approved_at,approved_by")
      .eq("id", userId)
      .maybeSingle();
    profile = (data as ProxyProfile | null) ?? null;
  }

  const requestHeaders = new Headers(request.headers);
  cleanAuthHeaders(requestHeaders);
  if (user) {
    requestHeaders.set("x-cf-auth-verified", "1");
    requestHeaders.set("x-cf-auth-user-id", user.id);
    requestHeaders.set("x-cf-auth-email", encoded(user.email));
    requestHeaders.set("x-cf-auth-email-verified", user.email_confirmed_at ? "1" : "0");
    if (profile) {
      requestHeaders.set("x-cf-auth-profile-id", profile.id);
      requestHeaders.set("x-cf-auth-full-name", encoded(profile.full_name));
      requestHeaders.set("x-cf-auth-role", profile.role);
      requestHeaders.set("x-cf-auth-status", profile.status);
      requestHeaders.set("x-cf-auth-created-at", encoded(profile.created_at));
      requestHeaders.set("x-cf-auth-approved-at", encoded(profile.approved_at));
      requestHeaders.set("x-cf-auth-approved-by", encoded(profile.approved_by));
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const cookie of cookieWrites) response.cookies.set(cookie.name, cookie.value, cookie.options as never);
  if (cookieWrites.length) response.headers.set("Cache-Control", "private, no-store");

  return { response, cookieWrites, user, profile, hadAuthCookie };
}

export function applyProxyCookies(response: NextResponse, writes: CookieWrite[]) {
  for (const cookie of writes) {
    response.cookies.set(cookie.name, cookie.value, cookie.options as never);
  }
  if (writes.length) response.headers.set("Cache-Control", "private, no-store");
  return response;
}
