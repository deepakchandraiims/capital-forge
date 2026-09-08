import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "../supabase/server";

export type AccountRole = "admin" | "user";
export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";

export type AuthProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: AccountRole;
  status: AccountStatus;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
};

export type AuthContext = {
  user: { id: string; email: string | null; emailVerified: boolean } | null;
  profile: AuthProfile | null;
};

function decoded(value: string | null) {
  if (!value) return "";
  try { return decodeURIComponent(value); } catch { return value; }
}

async function proxyAuthContext(): Promise<AuthContext | null> {
  const h = await headers();
  if (h.get("x-cf-auth-verified") !== "1") return null;
  const id = h.get("x-cf-auth-user-id");
  if (!id) return null;
  const email = decoded(h.get("x-cf-auth-email")) || null;
  const role = h.get("x-cf-auth-role") as AccountRole | null;
  const status = h.get("x-cf-auth-status") as AccountStatus | null;
  const profileId = h.get("x-cf-auth-profile-id");
  const profile = profileId && role && status ? {
    id: profileId,
    email: email || "",
    full_name: decoded(h.get("x-cf-auth-full-name")) || null,
    role,
    status,
    created_at: decoded(h.get("x-cf-auth-created-at")),
    approved_at: decoded(h.get("x-cf-auth-approved-at")) || null,
    approved_by: decoded(h.get("x-cf-auth-approved-by")) || null
  } satisfies AuthProfile : null;

  return {
    user: { id, email, emailVerified: h.get("x-cf-auth-email-verified") === "1" },
    profile
  };
}

export async function getAuthContext(): Promise<AuthContext> {
  // The proxy already verified the JWT and loaded the profile. Reuse that
  // result instead of repeating Supabase Auth + profile network requests.
  const forwarded = await proxyAuthContext();
  if (forwarded) return forwarded;

  // Fallback for routes that intentionally bypass proxy auth handling.
  const supabase = await createServerSupabase();
  const { data: userData, error } = await supabase.auth.getUser();
  const user = error ? null : userData.user;
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,status,created_at,approved_at,approved_by")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      emailVerified: Boolean(user.email_confirmed_at)
    },
    profile: (profile as AuthProfile | null) ?? null
  };
}

export async function requireApproved() {
  const auth = await getAuthContext();
  if (!auth.user) redirect("/login");
  if (!auth.user.emailVerified) redirect("/pending?state=email-unverified");
  if (!auth.profile || auth.profile.status !== "approved") redirect("/pending");
  return auth as { user: NonNullable<AuthContext["user"]>; profile: AuthProfile };
}

export async function requireAdmin() {
  const auth = await requireApproved();
  if (auth.profile.role !== "admin") redirect("/404");
  return auth as { user: NonNullable<AuthContext["user"]>; profile: AuthProfile & { role: "admin" } };
}
