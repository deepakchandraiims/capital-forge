import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { AccountRole, AccountStatus } from "../auth/server";

type CookieWrite = { name: string; value: string; options?: Record<string, unknown> };

export type ProxyProfile = {
  id: string;
  role: AccountRole;
  status: AccountStatus;
};

export async function readProxyAuth(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const cookieWrites: CookieWrite[] = [];
  let response = NextResponse.next({ request });

  if (!url || !key) {
    return { response, cookieWrites, user: null, profile: null as ProxyProfile | null };
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
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        response.headers.set("Cache-Control", "private, no-store");
      }
    }
  });

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user ?? null;
  let profile: ProxyProfile | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("id,role,status")
      .eq("id", user.id)
      .maybeSingle();
    profile = (data as ProxyProfile | null) ?? null;
  }

  return { response, cookieWrites, user, profile };
}

export function applyProxyCookies(response: NextResponse, writes: CookieWrite[]) {
  for (const cookie of writes) {
    response.cookies.set(cookie.name, cookie.value, cookie.options as never);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
