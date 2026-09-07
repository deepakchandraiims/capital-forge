import "server-only";
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

export async function getAuthContext(): Promise<AuthContext> {
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
